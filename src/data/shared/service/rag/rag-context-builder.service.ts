/**
 * RAG Context Builder — Semantic search for AI chat context.
 *
 * Replaces the old "dump all data" approach with intelligent retrieval:
 * 1. Extract user intent/query from latest message
 * 2. Semantic search over embedded medical records
 * 3. Return only the most relevant context (top 5-10 chunks)
 *
 * Usage in chat API:
 * ```ts
 * const context = await ragContextBuilder.buildContext({
 *   userId: user.uid,
 *   profileId,
 *   query: latestUserMessage,
 * });
 * // Inject `context` into system prompt instead of full userSnapshot
 * ```
 */

import { ragService } from "./rag.service";
import type { SearchResult } from "./rag.types";
import {
  triStoreRagService,
  type TriStoreSearchOptions,
} from "./tri-store-rag.service";
export type { TriStoreContextResult } from "./tri-store.types";

const RECENCY_WINDOW_DAYS = 30;
const MAX_RECENCY_BOOST = 0.15;
const MAX_SEVERITY_BOOST = 0.2;

function getMetadataString(
  result: SearchResult,
  key: string,
): string | undefined {
  const value = result.chunk.metadata[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getMetadataNumber(
  result: SearchResult,
  key: string,
): number | undefined {
  const value = result.chunk.metadata[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function getObservedAt(result: SearchResult): Date | undefined {
  const observed = getMetadataString(result, "observedAt");
  if (observed) {
    const parsed = new Date(observed);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const recorded = getMetadataString(result, "recordedAt");
  if (!recorded) return undefined;
  const parsed = new Date(recorded);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

function getRecencyBoost(observedAt?: Date): number {
  if (!observedAt) return 0;

  const msInDay = 1000 * 60 * 60 * 24;
  const ageDays = (Date.now() - observedAt.getTime()) / msInDay;
  if (ageDays <= 0) return MAX_RECENCY_BOOST;
  if (ageDays >= RECENCY_WINDOW_DAYS) return 0;

  const remainingRatio = 1 - ageDays / RECENCY_WINDOW_DAYS;
  return MAX_RECENCY_BOOST * remainingRatio;
}

function getSeverityBoost(result: SearchResult): number {
  const severity = getMetadataNumber(result, "severity");
  if (severity == null) return 0;

  const normalized = Math.max(0, Math.min(10, severity)) / 10;
  return MAX_SEVERITY_BOOST * normalized;
}

function getPersistenceBoost(result: SearchResult): number {
  const state = getMetadataString(result, "state")?.toLowerCase();

  if (state === "worsening") return 0.15;
  if (state === "stable") return 0.08;

  const contentLower = result.chunk.content.toLowerCase();
  if (contentLower.includes("duration:")) return 0.04;
  return 0;
}

function getSourceQualityBoost(result: SearchResult): number {
  const source = getMetadataString(result, "source")?.toLowerCase();
  if (!source) return 0;

  if (source === "assessment") return 0.05;
  if (source === "doctor-note") return 0.05;
  if (source === "manual") return 0.03;
  if (source === "chat") return 0.01;
  return 0;
}

function getClinicalBoost(result: SearchResult): number {
  if (result.chunk.type !== "symptom-observation") return 0;

  const observedAt = getObservedAt(result);
  const recencyBoost = getRecencyBoost(observedAt);
  const severityBoost = getSeverityBoost(result);
  const persistenceBoost = getPersistenceBoost(result);
  const sourceQualityBoost = getSourceQualityBoost(result);

  return recencyBoost + severityBoost + persistenceBoost + sourceQualityBoost;
}

function prioritizeClinically(results: SearchResult[]): SearchResult[] {
  const scored = results.map((result, index) => {
    const clinicalBoost = getClinicalBoost(result);
    const boostedScore = Math.min(1, result.score + clinicalBoost);
    return {
      index,
      boostedScore,
      result: {
        ...result,
        score: boostedScore,
      },
    };
  });

  scored.sort((a, b) => {
    if (b.boostedScore !== a.boostedScore) {
      return b.boostedScore - a.boostedScore;
    }
    return a.index - b.index;
  });

  return scored.map((entry) => entry.result);
}

export interface BuildContextParams {
  userId: string;
  profileId: string;
  /** User's latest message (for semantic search) */
  query: string;
  /** Max candidates for initial KNN search (default: 30 with reranking, 10 without) */
  limit?: number;
  /** Minimum similarity score for initial search (default: 0.4 with reranking, 0.5 without) */
  minScore?: number;
  /**
   * Enable reranking via AWS Bedrock Cohere Rerank (default: true).
   * Reranking is now handled inside RAGService.search() — this flag is forwarded directly.
   */
  rerank?: boolean;
  /** Number of results after reranking (default: 10) */
  rerankTopK?: number;
  /** Minimum rerank score 0-1 for AWS Bedrock (default: 0.5) */
  rerankMinScore?: number;
  /**
   * Minimum score as a ratio of the top result's score (0-1).
   * E.g. 0.85 keeps only results scoring ≥ 85% of the best match.
   */
  rerankMinScoreRatio?: number;
  /** Pre-computed query embedding vector (768-dim). Skips internal embed call when provided. */
  queryEmbedding?: number[];
  /**
   * Restrict search to specific document types (server-side Firestore filter — no extra cost).
   * Omit to search all types.
   */
  types?: import("./rag.types").DocumentChunk["type"][];
}

export interface RAGContextResult {
  /** Formatted context string for LLM injection */
  context: string;
  /** Raw search results (for debugging / UI visualization) */
  results: SearchResult[];
  /** Number of chunks retrieved */
  count: number;
}

export class RAGContextBuilderService {
  /**
   * Build AI context using semantic search over patient's medical records.
   *
   * With reranking (default):
   * 1. Vector search retrieves 30-50 candidates
   * 2. AWS Bedrock Cohere Rerank scores for relevance
   * 3. Returns top 10 most relevant results
   *
   * Without reranking:
   * - Direct vector search returns top 10
   */
  async buildContext(params: BuildContextParams): Promise<RAGContextResult> {
    const startTime = performance.now();
    console.log("[RAG Builder] Started");

    const {
      userId,
      query,
      rerank = true,
      rerankTopK = 10,
      rerankMinScore = 0.01,
      rerankMinScoreRatio,
      queryEmbedding,
      types,
    } = params;

    // Reranking (and its wider candidate retrieval) is handled inside ragService.search()
    const limit = params.limit;
    const minScore = params.minScore;

    // Step 1: Semantic search + reranking (single call)
    const searchStart = performance.now();
    const results = await ragService.search(query, {
      userId,
      limit,
      minScore,
      rerank,
      rerankTopK,
      rerankMinScore,
      rerankMinScoreRatio,
      queryEmbedding,
      // When caller restricts types, Firestore filters server-side (no extra cost).
      // Default to all clinical types when unspecified.
      types: types ?? [
        "profile",
        "patient",
        "condition",
        "symptom-observation",
        "medication",
        "assessment",
        "soap",
        "vital",
        "bloodtest",
        "prescription",
      ],
    });
    const clinicallyPrioritized = prioritizeClinically(results);
    console.log(
      `[RAG Builder] Search${rerank ? " + rerank" : ""} completed: ${(performance.now() - searchStart).toFixed(0)}ms, results: ${results.length}`,
    );

    // Step 2: Build formatted context string
    const formatStart = performance.now();
    const context = ragService.buildContext(clinicallyPrioritized);
    console.log(
      `[RAG Builder] Format completed: ${(performance.now() - formatStart).toFixed(0)}ms`,
    );

    console.log(
      `[RAG Builder] Total time: ${(performance.now() - startTime).toFixed(0)}ms, returned: ${results.length}`,
    );

    return {
      context,
      results: clinicallyPrioritized,
      count: clinicallyPrioritized.length,
    };
  }

  /**
   * Build context for specific document types only.
   * Useful for specialized queries (e.g., "show my medications" → search only medications).
   */
  async buildContextForTypes(
    params: BuildContextParams & {
      types: Array<
        | "symptom-observation"
        | "condition"
        | "medication"
        | "assessment"
        | "soap"
        | "vital"
        | "bloodtest"
        | "prescription"
      >;
    },
  ): Promise<RAGContextResult> {
    const { userId, query, limit = 10, minScore = 0.5, types } = params;

    const results = await ragService.search(query, {
      userId,
      limit,
      minScore,
      types,
    });

    const context = ragService.buildContext(results);

    return {
      context,
      results,
      count: results.length,
    };
  }

  /**
   * Hybrid approach: combine RAG with live Firestore queries.
   * Use this for queries that need both historical context AND real-time data.
   *
   * Example: "What's my latest blood pressure?"
   * → RAG gets historical BP trends
   * → Live query gets today's most recent BP
   */
  async buildHybridContext(
    params: BuildContextParams & {
      /** Additional static context (e.g., current profile fields, today's vitals) */
      staticContext?: string;
    },
  ): Promise<RAGContextResult> {
    const ragResult = await this.buildContext(params);

    if (params.staticContext) {
      const combinedContext = [
        params.staticContext,
        "",
        ragResult.context,
      ].join("\n");

      return {
        ...ragResult,
        context: combinedContext,
      };
    }

    return ragResult;
  }
  /**
   * Tri-Store semantic search: parallel weighted search across condition, symptom, and KB stores.
   *
   * Returns a `TriStoreContextResult` with per-store provenance tags suitable for 2026
   * regulatory traceability: `<source store="condition_store" weight="1.0" label="...">`.
   *
   * Replaces the single-store `buildContext()` in agentic RAG and tool calls.
   */
  async buildTriStoreContext(
    params: TriStoreSearchOptions,
  ): ReturnType<typeof triStoreRagService.buildTriStoreContext> {
    return triStoreRagService.buildTriStoreContext(params);
  }
}

/** Singleton instance */
export const ragContextBuilder = new RAGContextBuilderService();
