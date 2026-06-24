import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { queryRepairService } from "@/data/shared/service/rag/query-repair.service";
import {
  retrievalEvaluatorService,
  type EvaluatorModelTier,
  type RetrievalEvaluation,
} from "@/data/shared/service/rag/retrieval-evaluator.service";
import { webFallbackService } from "@/data/shared/service/rag/web-fallback.service";
import { ragService } from "@/data/shared/service/rag/rag.service";
import { triStoreRagService } from "@/data/shared/service/rag/tri-store-rag.service";
import type { TriStoreProvenance } from "@/data/shared/service/rag/tri-store.types";
import {
  initialEvalRoute,
  makeRepairEvalRoute,
  webFallbackEvalRoute,
} from "@/workflow/conditions/retrieval.conditions";
import { RAG_NODES } from "@/workflow/edges/node-names";

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
  provenance: TriStoreProvenance[];
}

type InternalRetrievalResult = {
  context: string;
  provenance: TriStoreProvenance[];
  conditionCount: number;
  symptomCount: number;
  kbCount: number;
  partialFailure: boolean;
  /** Combined patient results (condition + symptom stores) for evaluator heuristics */
  ragResults: Awaited<
    ReturnType<typeof triStoreRagService.buildTriStoreContext>
  >["allPatientResults"];
  /** Raw KB entries for evaluator heuristics */
  kbEntries: Awaited<
    ReturnType<typeof triStoreRagService.buildTriStoreContext>
  >["allKbResults"];
};

type QueryRepairResult = Awaited<ReturnType<typeof queryRepairService.repair>>;

type GraphState = {
  input: AgenticRagGraphInput;
  retrieval: InternalRetrievalResult | null;
  context: string | null;
  evaluation: RetrievalEvaluation | null;
  repairedQuery: QueryRepairResult | null;
  partialFailure: boolean;
  provenance: TriStoreProvenance[];
  final: AgenticRagGraphOutput | null;
};

const RagGraphAnnotation = Annotation.Root({
  input: Annotation<AgenticRagGraphInput>(),
  retrieval: Annotation<InternalRetrievalResult | null>(),
  context: Annotation<string | null>(),
  evaluation: Annotation<RetrievalEvaluation | null>(),
  repairedQuery: Annotation<QueryRepairResult | null>(),
  partialFailure: Annotation<boolean>(),
  provenance: Annotation<TriStoreProvenance[]>(),
  final: Annotation<AgenticRagGraphOutput | null>(),
});

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
  const result = await triStoreRagService.buildTriStoreContext({
    userId: opts.userId,
    profileId: opts.profileId,
    query: opts.query,
    queryEmbedding: opts.queryEmbedding,
    broaden: opts.broaden,
    rerank: true,
  });

  return {
    context: result.context,
    provenance: result.provenance,
    conditionCount: result.conditionCount,
    symptomCount: result.symptomCount,
    kbCount: result.kbCount,
    partialFailure: result.partialFailure,
    ragResults: result.allPatientResults,
    kbEntries: result.allKbResults,
  };
}

async function initialRetrieveEvaluateNode(state: GraphState) {
  const t0 = performance.now();
  const retrieval = await retrieveInternalContext({
    userId: state.input.userId,
    profileId: state.input.profileId,
    query: state.input.userQuery,
    queryEmbedding: state.input.queryEmbedding,
  });
  const retrieveMs = performance.now() - t0;

  // Tri-store context already includes <source> provenance tags — use directly.
  const context =
    retrieval.context.trim().length > 0 ? retrieval.context : null;

  const t1 = performance.now();
  const evaluation = await retrievalEvaluatorService.evaluate({
    userId: state.input.userId,
    query: state.input.userQuery,
    ragResults: retrieval.ragResults,
    kbResults: retrieval.kbEntries,
    context,
    modelTier: state.input.evaluatorModel,
  });
  console.log(
    `[AgenticRAG] initial: retrieve=${retrieveMs.toFixed(0)}ms eval=${(performance.now() - t1).toFixed(0)}ms pass=${evaluation.pass}`,
  );

  return {
    retrieval,
    context,
    evaluation,
    provenance: retrieval.provenance,
    partialFailure: retrieval.partialFailure,
  };
}

async function repairAndRetrieveEvaluateNode(state: GraphState) {
  const baseEvaluation =
    state.evaluation ?? defaultEvaluation("missing-evaluation");
  const t0 = performance.now();
  const repairedQuery = await queryRepairService.repair({
    userId: state.input.userId,
    query: state.input.userQuery,
    evaluatorReason: baseEvaluation.reason,
    modelTier: state.input.repairModel,
  });
  const repairMs = performance.now() - t0;

  const repairedEmbedding =
    repairedQuery.rewrittenQuery === state.input.userQuery
      ? state.input.queryEmbedding
      : await ragService.embedQuery(repairedQuery.rewrittenQuery);

  const t1 = performance.now();
  const retrieval = await retrieveInternalContext({
    userId: state.input.userId,
    profileId: state.input.profileId,
    query: repairedQuery.rewrittenQuery,
    queryEmbedding: repairedEmbedding,
    broaden: repairedQuery.broadenSearch,
  });
  const retrieveMs = performance.now() - t1;

  const context =
    retrieval.context.trim().length > 0 ? retrieval.context : null;

  const t2 = performance.now();
  const evaluation = await retrievalEvaluatorService.evaluate({
    userId: state.input.userId,
    query: state.input.userQuery,
    ragResults: retrieval.ragResults,
    kbResults: retrieval.kbEntries,
    context,
    modelTier: state.input.evaluatorModel,
  });
  console.log(
    `[AgenticRAG] repair: repairLLM=${repairMs.toFixed(0)}ms retrieve=${retrieveMs.toFixed(0)}ms eval=${(performance.now() - t2).toFixed(0)}ms pass=${evaluation.pass}`,
  );

  return {
    retrieval,
    context,
    evaluation,
    repairedQuery,
    provenance: retrieval.provenance,
    partialFailure: state.partialFailure || retrieval.partialFailure,
  };
}

async function webFallbackEvaluateNode(state: GraphState) {
  const t0 = performance.now();
  const webEntries = await webFallbackService.searchMedicalReferences(
    state.input.userQuery,
    { timeoutMs: state.input.webFallbackTimeoutMs },
  );
  const searchMs = performance.now() - t0;
  const webText = webFallbackService.formatForPrompt(webEntries);

  const context = joinContextParts([
    state.context ?? "",
    webText
      ? `<source store="web_fallback" weight="0.2" label="Web: Medical reference search">\n${webText}\n</source>`
      : "",
  ]);

  const retrieval = state.retrieval;
  const t1 = performance.now();
  const evaluation = await retrievalEvaluatorService.evaluate({
    userId: state.input.userId,
    query: state.input.userQuery,
    ragResults: retrieval?.ragResults ?? [],
    kbResults: retrieval?.kbEntries ?? [],
    context,
    modelTier: state.input.evaluatorModel,
  });
  console.log(
    `[AgenticRAG] webFallback: search=${searchMs.toFixed(0)}ms eval=${(performance.now() - t1).toFixed(0)}ms pass=${evaluation.pass}`,
  );

  return { context, evaluation };
}

function buildGraph() {
  return new StateGraph(RagGraphAnnotation)
    .addNode(RAG_NODES.INITIAL_RETRIEVE_EVALUATE, initialRetrieveEvaluateNode)
    .addNode(
      RAG_NODES.REPAIR_AND_RETRIEVE_EVALUATE,
      repairAndRetrieveEvaluateNode,
    )
    .addNode(RAG_NODES.WEB_FALLBACK_EVALUATE, webFallbackEvaluateNode)
    .addNode(RAG_NODES.FINAL_INITIAL, (state: GraphState) => ({
      final: {
        context: state.context,
        partialFailure: state.partialFailure,
        evaluation: toEvaluationMeta("initial", state.evaluation),
        provenance: state.retrieval?.provenance ?? [],
      },
    }))
    .addNode(RAG_NODES.FINAL_REPAIRED, (state: GraphState) => ({
      final: {
        context: state.context,
        partialFailure: state.partialFailure,
        evaluation: toEvaluationMeta("internal-repair", state.evaluation),
        provenance: state.retrieval?.provenance ?? [],
      },
    }))
    .addNode(RAG_NODES.FINAL_WEB, (state: GraphState) => ({
      final: {
        context: state.context,
        partialFailure: state.partialFailure,
        evaluation: toEvaluationMeta("web-fallback", state.evaluation),
        provenance: state.retrieval?.provenance ?? [],
      },
    }))
    .addNode(RAG_NODES.FINAL_FAILED, (state: GraphState) => ({
      final: {
        context: null,
        partialFailure: true,
        evaluation: toEvaluationMeta("failed", state.evaluation),
        provenance: [],
      },
    }))
    .addEdge(START, RAG_NODES.INITIAL_RETRIEVE_EVALUATE)
    .addConditionalEdges(
      RAG_NODES.INITIAL_RETRIEVE_EVALUATE,
      initialEvalRoute,
      {
        final_initial: RAG_NODES.FINAL_INITIAL,
        repair_and_retrieve_evaluate: RAG_NODES.REPAIR_AND_RETRIEVE_EVALUATE,
      },
    )
    .addConditionalEdges(
      RAG_NODES.REPAIR_AND_RETRIEVE_EVALUATE,
      makeRepairEvalRoute(retrievalEvaluatorService.shouldUseWebFallback),
      {
        final_repaired: RAG_NODES.FINAL_REPAIRED,
        web_fallback_evaluate: RAG_NODES.WEB_FALLBACK_EVALUATE,
        final_failed: RAG_NODES.FINAL_FAILED,
      },
    )
    .addConditionalEdges(
      RAG_NODES.WEB_FALLBACK_EVALUATE,
      webFallbackEvalRoute,
      {
        final_web: RAG_NODES.FINAL_WEB,
        final_failed: RAG_NODES.FINAL_FAILED,
      },
    )
    .addEdge(RAG_NODES.FINAL_INITIAL, END)
    .addEdge(RAG_NODES.FINAL_REPAIRED, END)
    .addEdge(RAG_NODES.FINAL_WEB, END)
    .addEdge(RAG_NODES.FINAL_FAILED, END)
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
    provenance: [],
    final: null,
  });

  const final = state.final;
  if (!final) {
    return {
      context: null,
      partialFailure: true,
      provenance: [],
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
