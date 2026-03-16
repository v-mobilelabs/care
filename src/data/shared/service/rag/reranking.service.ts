/**
 * Reranking Service — AWS Bedrock reranking for RAG results
 *
 * Architecture:
 * 1. Initial vector search retrieves top-N candidates (e.g., 30-50)
 * 2. AWS Bedrock Cohere Rerank model scores each candidate for relevance
 * 3. Return top-K reranked results (e.g., 10)
 *
 * Benefits:
 * - Purpose-built reranking model (more accurate than LLM-based scoring)
 * - Fast and cost-effective
 * - Understands semantic nuances and medical context
 *
 * Usage:
 * ```ts
 * const reranked = await rerankingService.rerank(query, results, { topK: 10 });
 * ```
 */

import { rerank } from "ai";
import { bedrock } from "@ai-sdk/amazon-bedrock";
import type { SearchResult } from "./rag.types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RerankOptions {
  /** Number of top results to return after reranking (default: 10) */
  topK?: number;
  /** Minimum absolute relevance score 0-1 (default: 0.01) */
  minScore?: number;
  /**
   * Minimum score as a ratio of the top result's score (0-1, default: none).
   * E.g. 0.85 keeps only results scoring ≥ 85% of the best match.
   * Applied after the absolute minScore filter. Adaptive to each query's
   * score distribution — avoids hard-coding a brittle absolute threshold.
   */
  minScoreRatio?: number;
}

// ── Reranking Service ─────────────────────────────────────────────────────────

export class RerankingService {
  // AWS Bedrock Cohere Rerank v3.5 model
  private readonly model = bedrock.rerankingModel("cohere.rerank-v3-5:0");

  /**
   * Rerank search results using AWS Bedrock Cohere Rerank model.
   *
   * @param query - User's query/question
   * @param results - Initial search results from vector search
   * @param options - Reranking options (topK, minScore)
   * @returns Top-K reranked results sorted by relevance
   */
  async rerank(
    query: string,
    results: SearchResult[],
    options: RerankOptions = {},
  ): Promise<SearchResult[]> {
    const startTime = performance.now();

    // Early exit if no results or too few to rerank
    if (results.length === 0) {
      return [];
    }

    const topK = options.topK ?? 10;
    const minScore = options.minScore ?? 0.01;
    const minScoreRatio = options.minScoreRatio;

    // If we already have <= topK results, no need to rerank
    if (results.length <= topK) {
      console.log(
        `[Reranking] Skipped (only ${results.length} results), returning all`,
      );
      return results;
    }

    console.log(
      `[Reranking] Started: ${results.length} candidates → top ${topK}`,
    );

    try {
      // Prepare documents for reranking (just the content text)
      const documents = results.map((result) => result.chunk.content);

      // Call AWS Bedrock Cohere Rerank
      const rerankStart = performance.now();
      const { ranking } = await rerank({
        model: this.model,
        query,
        documents,
        topN: topK,
      });

      console.log(
        `[Reranking] Bedrock rerank: ${(performance.now() - rerankStart).toFixed(0)}ms, returned: ${ranking.length}`,
      );

      // Map reranked indices back to original SearchResult objects
      const topScore = ranking.length > 0 ? ranking[0].score : 0;
      const ratioThreshold =
        minScoreRatio == null ? 0 : topScore * minScoreRatio;
      const effectiveMin = Math.max(minScore, ratioThreshold);

      if (minScoreRatio == null) {
        // no ratio logging
      } else if (process.env.NODE_ENV === "development") {
        console.log(
          `[Reranking] Top score: ${(topScore * 100).toFixed(1)}% → ratio cutoff: ${(ratioThreshold * 100).toFixed(1)}% (effective min: ${(effectiveMin * 100).toFixed(1)}%)`,
        );
      }

      const reranked: SearchResult[] = [];
      for (const item of ranking) {
        const originalResult = results[item.originalIndex];
        const title =
          typeof originalResult.chunk.metadata.title === "string"
            ? originalResult.chunk.metadata.title
            : originalResult.chunk.sourceId;

        if (process.env.NODE_ENV === "development") {
          console.log(
            `[Reranking] [${item.originalIndex}] Score: ${(item.score * 100).toFixed(1)}% ${item.score >= effectiveMin ? "✓" : "✗"} - ${originalResult.chunk.type}: ${title}`,
          );
        }

        if (item.score >= effectiveMin) {
          reranked.push({
            ...originalResult,
            score: item.score,
          });
        }
      }

      console.log(
        `[Reranking] Complete: ${(performance.now() - startTime).toFixed(0)}ms, returned: ${reranked.length}`,
      );

      return reranked;
    } catch (error) {
      console.error("[Reranking] Failed:", error);
      // Fallback: return original top-K results
      console.warn("[Reranking] Fallback: returning original top results");
      return results.slice(0, topK);
    }
  }

  /**
   * Batch reranking for multiple queries (useful for multi-turn conversations).
   * Runs all reranking operations in parallel.
   */
  async rerankBatch(
    queries: Array<{ query: string; results: SearchResult[] }>,
    options: RerankOptions = {},
  ): Promise<SearchResult[][]> {
    return Promise.all(
      queries.map((q) => this.rerank(q.query, q.results, options)),
    );
  }
}

/** Singleton instance */
export const rerankingService = new RerankingService();
