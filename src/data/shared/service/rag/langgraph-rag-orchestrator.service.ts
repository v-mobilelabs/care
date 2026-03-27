import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ragContextBuilder } from "@/data/shared/service";
import { knowledgeBaseService } from "@/data/knowledge-base";
import { queryRepairService } from "./query-repair.service";
import {
  retrievalEvaluatorService,
  type EvaluatorModelTier,
  type RetrievalEvaluation,
} from "./retrieval-evaluator.service";
import { webFallbackService } from "./web-fallback.service";
import { ragService } from "./rag.service";

export type RagEvaluationStage =
  | "initial"
  | "internal-repair"
  | "web-fallback"
  | "failed";

export type RagEvaluationMeta = {
  stage: RagEvaluationStage;
  reason: string;
  scores: {
    relevance: number;
    grounding: number;
    coverage: number;
    freshness: number;
    sourceTrust: number;
  };
};

export interface AgenticRagGraphInput {
  userId: string;
  profileId: string;
  userQuery: string;
  queryEmbedding: number[];
  evaluatorModel: EvaluatorModelTier;
  repairModel: "lite" | "fast" | "pro";
  webFallbackTimeoutMs: number;
}

export interface AgenticRagGraphOutput {
  context: string | null;
  partialFailure: boolean;
  evaluation: RagEvaluationMeta;
}

type InternalRetrievalResult = {
  ragResults: Awaited<ReturnType<typeof ragContextBuilder.buildContext>>["results"];
  ragContext: string;
  kbEntries: Awaited<ReturnType<typeof knowledgeBaseService.search>>;
  kbText: string;
  partialFailure: boolean;
};

type QueryRepairResult = Awaited<ReturnType<typeof queryRepairService.repair>>;

type GraphState = {
  input: AgenticRagGraphInput;
  retrieval: InternalRetrievalResult | null;
  context: string | null;
  evaluation: RetrievalEvaluation | null;
  repairedQuery: QueryRepairResult | null;
  partialFailure: boolean;
  final: AgenticRagGraphOutput | null;
};

const RagGraphAnnotation = Annotation.Root({
  input: Annotation<AgenticRagGraphInput>(),
  retrieval: Annotation<InternalRetrievalResult | null>(),
  context: Annotation<string | null>(),
  evaluation: Annotation<RetrievalEvaluation | null>(),
  repairedQuery: Annotation<QueryRepairResult | null>(),
  partialFailure: Annotation<boolean>(),
  final: Annotation<AgenticRagGraphOutput | null>(),
});

function wrapProvenance(type: "patient_record" | "kb" | "web", body: string): string {
  return `<source type="${type}">\n${body}\n</source>`;
}

function joinContextParts(parts: string[]): string | null {
  const nonEmpty = parts.filter((part) => part.trim().length > 0);
  if (nonEmpty.length === 0) return null;
  return nonEmpty.join("\n\n");
}

function defaultEvaluation(reason: string): RetrievalEvaluation {
  return {
    pass: false,
    reason,
    scores: {
      relevance: 0,
      grounding: 0,
      coverage: 0,
      freshness: 0,
      sourceTrust: 0,
    },
  };
}

function toEvaluationMeta(
  stage: RagEvaluationStage,
  evaluation: RetrievalEvaluation | null,
): RagEvaluationMeta {
  const safeEvaluation = evaluation ?? defaultEvaluation("evaluation-missing");
  return {
    stage,
    reason: safeEvaluation.reason,
    scores: safeEvaluation.scores,
  };
}

async function retrieveInternalContext(opts: {
  userId: string;
  profileId: string;
  query: string;
  queryEmbedding: number[];
  broaden?: boolean;
}): Promise<InternalRetrievalResult> {
  const limit = opts.broaden ? 30 : 15;
  const rerankTopK = opts.broaden ? 8 : 5;
  const rerankMinScoreRatio = opts.broaden ? 0.75 : 0.85;

  const [ragResult, kbResult] = await Promise.allSettled([
    ragContextBuilder.buildContext({
      userId: opts.userId,
      profileId: opts.profileId,
      query: opts.query,
      queryEmbedding: opts.queryEmbedding,
      rerank: true,
      limit,
      rerankTopK,
      rerankMinScore: 0.01,
      rerankMinScoreRatio,
    }),
    knowledgeBaseService
      .search(opts.query, {
        topK: opts.broaden ? 8 : 5,
        queryEmbedding: opts.queryEmbedding,
      })
      .catch((err: unknown) => {
        console.error("[LangGraphRAG] Knowledge base fetch failed:", err);
        return [];
      }),
  ]);

  const ragResults =
    ragResult.status === "fulfilled" && ragResult.value
      ? ragResult.value.results
      : [];
  const ragContext =
    ragResult.status === "fulfilled" && ragResult.value
      ? ragResult.value.context
      : "";
  const kbEntries =
    kbResult.status === "fulfilled" && kbResult.value ? kbResult.value : [];
  const kbText =
    kbEntries.length > 0 ? knowledgeBaseService.formatForPrompt(kbEntries) : "";

  return {
    ragResults,
    ragContext,
    kbEntries,
    kbText,
    partialFailure:
      ragResult.status === "rejected" || kbResult.status === "rejected",
  };
}

function buildGraph() {
  return new StateGraph(RagGraphAnnotation)
    .addNode("initial_retrieve_evaluate", async (state: GraphState) => {
      const retrieval = await retrieveInternalContext({
        userId: state.input.userId,
        profileId: state.input.profileId,
        query: state.input.userQuery,
        queryEmbedding: state.input.queryEmbedding,
      });

      const context = joinContextParts([
        retrieval.kbText ? wrapProvenance("kb", retrieval.kbText) : "",
        retrieval.ragContext
          ? wrapProvenance("patient_record", retrieval.ragContext)
          : "",
      ]);

      const evaluation = await retrievalEvaluatorService.evaluate({
        userId: state.input.userId,
        query: state.input.userQuery,
        ragResults: retrieval.ragResults,
        kbResults: retrieval.kbEntries,
        context,
        modelTier: state.input.evaluatorModel,
      });

      return {
        retrieval,
        context,
        evaluation,
        partialFailure: retrieval.partialFailure,
      };
    })
    .addNode("repair_and_retrieve_evaluate", async (state: GraphState) => {
      const baseEvaluation = state.evaluation ?? defaultEvaluation("missing-evaluation");
      const repairedQuery = await queryRepairService.repair({
        userId: state.input.userId,
        query: state.input.userQuery,
        evaluatorReason: baseEvaluation.reason,
        modelTier: state.input.repairModel,
      });

      const repairedEmbedding =
        repairedQuery.rewrittenQuery === state.input.userQuery
          ? state.input.queryEmbedding
          : await ragService.embedQuery(repairedQuery.rewrittenQuery);

      const retrieval = await retrieveInternalContext({
        userId: state.input.userId,
        profileId: state.input.profileId,
        query: repairedQuery.rewrittenQuery,
        queryEmbedding: repairedEmbedding,
        broaden: repairedQuery.broadenSearch,
      });

      const context = joinContextParts([
        retrieval.kbText ? wrapProvenance("kb", retrieval.kbText) : "",
        retrieval.ragContext
          ? wrapProvenance("patient_record", retrieval.ragContext)
          : "",
      ]);

      const evaluation = await retrievalEvaluatorService.evaluate({
        userId: state.input.userId,
        query: state.input.userQuery,
        ragResults: retrieval.ragResults,
        kbResults: retrieval.kbEntries,
        context,
        modelTier: state.input.evaluatorModel,
      });

      return {
        retrieval,
        context,
        evaluation,
        repairedQuery,
        partialFailure: state.partialFailure || retrieval.partialFailure,
      };
    })
    .addNode("web_fallback_evaluate", async (state: GraphState) => {
      const webEntries = await webFallbackService.searchMedicalReferences(
        state.input.userQuery,
        { timeoutMs: state.input.webFallbackTimeoutMs },
      );
      const webText = webFallbackService.formatForPrompt(webEntries);

      const context = joinContextParts([
        state.context ?? "",
        webText ? wrapProvenance("web", webText) : "",
      ]);

      const retrieval = state.retrieval;
      const evaluation = await retrievalEvaluatorService.evaluate({
        userId: state.input.userId,
        query: state.input.userQuery,
        ragResults: retrieval?.ragResults ?? [],
        kbResults: retrieval?.kbEntries ?? [],
        context,
        modelTier: state.input.evaluatorModel,
      });

      return {
        context,
        evaluation,
      };
    })
    .addNode("final_initial", (state: GraphState) => ({
      final: {
        context: state.context,
        partialFailure: state.partialFailure,
        evaluation: toEvaluationMeta("initial", state.evaluation),
      },
    }))
    .addNode("final_repaired", (state: GraphState) => ({
      final: {
        context: state.context,
        partialFailure: state.partialFailure,
        evaluation: toEvaluationMeta("internal-repair", state.evaluation),
      },
    }))
    .addNode("final_web", (state: GraphState) => ({
      final: {
        context: state.context,
        partialFailure: state.partialFailure,
        evaluation: toEvaluationMeta("web-fallback", state.evaluation),
      },
    }))
    .addNode("final_failed", (state: GraphState) => ({
      final: {
        context: null,
        partialFailure: true,
        evaluation: toEvaluationMeta("failed", state.evaluation),
      },
    }))
    .addEdge(START, "initial_retrieve_evaluate")
    .addConditionalEdges(
      "initial_retrieve_evaluate",
      (state: GraphState) => {
        if (state.evaluation?.pass) return "final_initial";
        return "repair_and_retrieve_evaluate";
      },
      {
        final_initial: "final_initial",
        repair_and_retrieve_evaluate: "repair_and_retrieve_evaluate",
      },
    )
    .addConditionalEdges(
      "repair_and_retrieve_evaluate",
      (state: GraphState) => {
        if (state.evaluation?.pass) return "final_repaired";
        if (retrievalEvaluatorService.shouldUseWebFallback(state.input.userQuery)) {
          return "web_fallback_evaluate";
        }
        return "final_failed";
      },
      {
        final_repaired: "final_repaired",
        web_fallback_evaluate: "web_fallback_evaluate",
        final_failed: "final_failed",
      },
    )
    .addConditionalEdges(
      "web_fallback_evaluate",
      (state: GraphState) => {
        if (state.evaluation?.pass) return "final_web";
        return "final_failed";
      },
      {
        final_web: "final_web",
        final_failed: "final_failed",
      },
    )
    .addEdge("final_initial", END)
    .addEdge("final_repaired", END)
    .addEdge("final_web", END)
    .addEdge("final_failed", END)
    .compile();
}

const ragGraph = buildGraph();

export async function runAgenticRagLangGraph(
  input: AgenticRagGraphInput,
): Promise<AgenticRagGraphOutput> {
  const state = await ragGraph.invoke({
    input,
    retrieval: null,
    context: null,
    evaluation: null,
    repairedQuery: null,
    partialFailure: false,
    final: null,
  });

  const final = state.final;
  if (!final) {
    return {
      context: null,
      partialFailure: true,
      evaluation: {
        stage: "failed",
        reason: "graph-final-state-missing",
        scores: {
          relevance: 0,
          grounding: 0,
          coverage: 0,
          freshness: 0,
          sourceTrust: 0,
        },
      },
    };
  }

  return final;
}
