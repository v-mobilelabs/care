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
 *   dependentId,
 *   query: latestUserMessage,
 * });
 * // Inject `context` into system prompt instead of full userSnapshot
 * ```
 */

import { ragService } from "./rag.service";
import type { SearchResult } from "./rag.types";

export interface BuildContextParams {
  userId: string;
  profileId: string;
  dependentId?: string;
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
      dependentId,
      query,
      rerank = true,
      rerankTopK = 10,
      rerankMinScore = 0.01,
      rerankMinScoreRatio,
      queryEmbedding,
    } = params;

    // Reranking (and its wider candidate retrieval) is handled inside ragService.search()
    const limit = params.limit;
    const minScore = params.minScore;

    // Step 1: Semantic search + reranking (single call)
    const searchStart = performance.now();
    const results = await ragService.search(query, {
      userId,
      dependentId,
      limit,
      minScore,
      rerank,
      rerankTopK,
      rerankMinScore,
      rerankMinScoreRatio,
      queryEmbedding,
      // Search all types — the model will naturally prioritize relevant ones
      types: [
        "profile",
        "patient",
        "condition",
        "medication",
        "assessment",
        "soap",
        "vital",
        "bloodtest",
        "prescription",
      ],
    });
    console.log(
      `[RAG Builder] Search${rerank ? " + rerank" : ""} completed: ${(performance.now() - searchStart).toFixed(0)}ms, results: ${results.length}`,
    );

    // Step 2: Build formatted context string
    const formatStart = performance.now();
    const context = ragService.buildContext(results);
    console.log(
      `[RAG Builder] Format completed: ${(performance.now() - formatStart).toFixed(0)}ms`,
    );

    console.log(
      `[RAG Builder] Total time: ${(performance.now() - startTime).toFixed(0)}ms, returned: ${results.length}`,
    );

    return {
      context,
      results,
      count: results.length,
    };
  }

  /**
   * Build context for specific document types only.
   * Useful for specialized queries (e.g., "show my medications" → search only medications).
   */
  async buildContextForTypes(
    params: BuildContextParams & {
      types: Array<
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
    const {
      userId,
      dependentId,
      query,
      limit = 10,
      minScore = 0.5,
      types,
    } = params;

    const results = await ragService.search(query, {
      userId,
      dependentId,
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
}

/** Singleton instance */
export const ragContextBuilder = new RAGContextBuilderService();
