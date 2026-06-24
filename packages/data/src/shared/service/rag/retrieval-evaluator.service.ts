import { aiService } from "@/data/shared/service/ai.service";
import type { KBSearchResult } from "@/data/knowledge-base";
import { z } from "zod";
import type { SearchResult } from "./rag.types";

export interface RetrievalScores {
  relevance: number;
  grounding: number;
  coverage: number;
  freshness: number;
  sourceTrust: number;
}

export interface RetrievalEvaluation {
  pass: boolean;
  scores: RetrievalScores;
  reason: string;
}

export type EvaluatorModelTier = "lite" | "fast" | "pro";

const RetrievalEvaluationSchema = z.object({
  pass: z.boolean(),
  reason: z.string().min(1),
  relevance: z.number().min(0).max(1),
  grounding: z.number().min(0).max(1),
  coverage: z.number().min(0).max(1),
  freshness: z.number().min(0).max(1),
  sourceTrust: z.number().min(0).max(1),
});

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "how",
  "i",
  "if",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "the",
  "to",
  "what",
  "when",
  "where",
  "who",
  "why",
  "with",
]);

const PATIENT_RECORD_HINTS = [
  "my medication",
  "my medicine",
  "my med",
  "my prescription",
  "my condition",
  "my blood",
  "my lab",
  "my result",
  "my report",
  "my vital",
  "my history",
  "my record",
  "my profile",
  "my age",
  "my weight",
  "my height",
  "my dosage",
  "prescribed",
  "i take",
  "i'm taking",
];

function clamp(score: number): number {
  return Math.max(0, Math.min(1, score));
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, curr) => acc + curr, 0);
  return sum / values.length;
}

function summarizeRag(results: SearchResult[]): string {
  const top = results.slice(0, 5);
  if (top.length === 0) return "None";

  return top
    .map((result, index) => {
      const title =
        typeof result.chunk.metadata.title === "string"
          ? result.chunk.metadata.title
          : result.chunk.sourceId;
      const snippet = result.chunk.content
        .slice(0, 220)
        .replaceAll(/\s+/g, " ");
      return `${index + 1}. [${result.chunk.type}] ${title} | semantic=${result.score.toFixed(3)} | ${snippet}`;
    })
    .join("\n");
}

function summarizeKb(results: KBSearchResult[]): string {
  const top = results.slice(0, 5);
  if (top.length === 0) return "None";

  return top
    .map((result, index) => {
      const snippet = result.entry.content
        .slice(0, 220)
        .replaceAll(/\s+/g, " ");
      return `${index + 1}. [${result.entry.category}] ${result.entry.title} | ${snippet}`;
    })
    .join("\n");
}

function parseModelTier(modelTier?: string): EvaluatorModelTier {
  if (modelTier === "lite" || modelTier === "fast" || modelTier === "pro") {
    return modelTier;
  }
  return "fast";
}

export class RetrievalEvaluatorService {
  private heuristicEvaluate(input: {
    query: string;
    ragResults: SearchResult[];
    kbResults: KBSearchResult[];
    context: string | null;
  }): RetrievalEvaluation {
    const queryTokens = tokenize(input.query);
    const contextText = (input.context ?? "").toLowerCase();

    const tokenHits =
      queryTokens.length === 0
        ? 0
        : queryTokens.filter((token) => contextText.includes(token)).length /
          queryTokens.length;

    const ragTopScores = input.ragResults.slice(0, 5).map((r) => r.score);
    const ragGrounding = average(ragTopScores);

    // KB search currently returns fixed score=1 for Firestore vector snapshots.
    // We cap this so KB evidence does not dominate semantic evidence from patient records.
    const kbGrounding = input.kbResults.length > 0 ? 0.72 : 0;
    const grounding = clamp(Math.max(ragGrounding, kbGrounding));

    const hasPatientContext = input.ragResults.length > 0 ? 1 : 0;
    const hasKbContext = input.kbResults.length > 0 ? 1 : 0;
    const coverage = clamp((hasPatientContext + hasKbContext) / 2);

    const freshness = clamp(
      input.query.toLowerCase().includes("latest") ||
        input.query.toLowerCase().includes("today")
        ? hasPatientContext * 0.8
        : 0.75,
    );

    let sourceTrustBase = 0.2;
    if (hasPatientContext > 0) {
      sourceTrustBase = 0.95;
    } else if (hasKbContext > 0) {
      sourceTrustBase = 0.8;
    }
    const sourceTrust = clamp(sourceTrustBase);

    const relevance = clamp(tokenHits);

    const hasSufficientText = (input.context?.trim().length ?? 0) >= 120;
    const pass =
      hasSufficientText &&
      relevance >= 0.75 &&
      grounding >= 0.8 &&
      coverage >= 0.6 &&
      freshness >= 0.5 &&
      sourceTrust >= 0.7;

    let reason = "pass";
    if (!hasSufficientText) reason = "insufficient-context";
    else if (relevance < 0.75) reason = "low-relevance";
    else if (grounding < 0.8) reason = "low-grounding";
    else if (coverage < 0.6) reason = "low-coverage";
    else if (freshness < 0.5) reason = "low-freshness";
    else if (sourceTrust < 0.7) reason = "low-source-trust";

    return {
      pass,
      reason,
      scores: {
        relevance,
        grounding,
        coverage,
        freshness,
        sourceTrust,
      },
    };
  }

  private isConfidentDecision(result: RetrievalEvaluation): boolean {
    const CLEAR_PASS_MARGIN = 0.15;
    const CLEAR_FAIL_MARGIN = 0.3;
    const thresholds = {
      relevance: 0.75,
      grounding: 0.8,
      coverage: 0.6,
      freshness: 0.5,
      sourceTrust: 0.7,
    };
    const scores = result.scores;
    const clearPass =
      scores.relevance >= thresholds.relevance + CLEAR_PASS_MARGIN &&
      scores.grounding >= thresholds.grounding + CLEAR_PASS_MARGIN &&
      scores.coverage >= thresholds.coverage + CLEAR_PASS_MARGIN &&
      scores.freshness >= thresholds.freshness + CLEAR_PASS_MARGIN &&
      scores.sourceTrust >= thresholds.sourceTrust + CLEAR_PASS_MARGIN;
    if (clearPass) return true;
    const clearFail =
      scores.relevance <= thresholds.relevance - CLEAR_FAIL_MARGIN ||
      scores.grounding <= thresholds.grounding - CLEAR_FAIL_MARGIN ||
      scores.coverage <= thresholds.coverage - CLEAR_FAIL_MARGIN ||
      scores.freshness <= thresholds.freshness - CLEAR_FAIL_MARGIN ||
      scores.sourceTrust <= thresholds.sourceTrust - CLEAR_FAIL_MARGIN;
    return clearFail;
  }

  async evaluate(input: {
    userId: string;
    query: string;
    ragResults: SearchResult[];
    kbResults: KBSearchResult[];
    context: string | null;
    modelTier?: EvaluatorModelTier;
  }): Promise<RetrievalEvaluation> {
    const modelTier = parseModelTier(input.modelTier);

    // Fast path: run heuristic first; only call LLM for borderline cases.
    const heuristic = this.heuristicEvaluate(input);
    if (this.isConfidentDecision(heuristic)) {
      return heuristic;
    }

    const prompt = [
      "You are a strict retrieval quality evaluator for healthcare AI.",
      "Evaluate whether retrieved context is accurate and sufficient for the user query.",
      "Return pass=true only if context is relevant, grounded by provided evidence, and has enough coverage.",
      "Prefer conservative judgments. If uncertain, fail.",
      "",
      `User query: ${input.query}`,
      "",
      "Patient retrieval evidence:",
      summarizeRag(input.ragResults),
      "",
      "Knowledge-base evidence:",
      summarizeKb(input.kbResults),
      "",
      "Combined context draft:",
      input.context && input.context.trim().length > 0
        ? input.context.slice(0, 4000)
        : "None",
      "",
      "Scoring rubric (0 to 1):",
      "- relevance: alignment with user query",
      "- grounding: claims supported by listed evidence",
      "- coverage: enough breadth/depth to answer safely",
      "- freshness: recency suitability for time-sensitive parts of query",
      "- sourceTrust: confidence in source hierarchy (patient_record > kb > web)",
      "",
      "Hard pass thresholds:",
      "- relevance >= 0.75",
      "- grounding >= 0.80",
      "- coverage >= 0.60",
      "- freshness >= 0.50",
      "- sourceTrust >= 0.70",
      "If any threshold fails, set pass=false.",
    ].join("\n");

    try {
      const response = await aiService.extractObject(
        RetrievalEvaluationSchema,
        [{ role: "user", content: prompt }],
        {
          userId: input.userId,
          skipCredit: true,
          useLite: modelTier === "lite",
          useFast: modelTier === "fast",
        },
      );

      return {
        pass: response.pass,
        reason: response.reason,
        scores: {
          relevance: response.relevance,
          grounding: response.grounding,
          coverage: response.coverage,
          freshness: response.freshness,
          sourceTrust: response.sourceTrust,
        },
      };
    } catch (error) {
      console.warn(
        "[RetrievalEvaluatorService] Gemini evaluation failed, using heuristic fallback:",
        error,
      );
      return this.heuristicEvaluate(input);
    }
  }

  shouldUseWebFallback(query: string): boolean {
    const lower = query.toLowerCase();
    const looksPatientSpecific = PATIENT_RECORD_HINTS.some((hint) =>
      lower.includes(hint),
    );
    return !looksPatientSpecific;
  }
}

export const retrievalEvaluatorService = new RetrievalEvaluatorService();
