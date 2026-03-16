/**
 * Guideline Service — Semantic search for clinical guidelines.
 *
 * Retrieves relevant guideline protocols from Firestore based on query embedding.
 * Replaces static guideline prompts with dynamic retrieval for scalability.
 */

import { embed } from "ai";
import { google } from "@ai-sdk/google";
import { db } from "@/lib/firebase/admin";
import { VectorQuery, VectorQuerySnapshot } from "@google-cloud/firestore";
import type { GuidelineDocument } from "../models/guideline.model";

// gemini-embedding-001 (768 dims) — matches Firestore vector index config.
const embeddingModel = google.embedding("gemini-embedding-001");
const EMBEDDING_OPTS = { google: { outputDimensionality: 768 } } as const;
const COLLECTION = "guidelines";

export interface GuidelineSearchOptions {
  /** Max number of guidelines to return */
  topK?: number;
  /** Filter by category if needed */
  category?: string;
  /** Pre-computed query embedding vector (768-dim). Skips internal embed call when provided. */
  queryEmbedding?: number[];
}

export class GuidelineService {
  /**
   * Search for relevant clinical guidelines based on query.
   * Returns top-k most relevant guidelines with their content.
   */
  async search(
    query: string,
    options: GuidelineSearchOptions = {},
  ): Promise<GuidelineDocument[]> {
    const {
      topK = 3,
      category,
      queryEmbedding: precomputedEmbedding,
    } = options;

    try {
      // 1. Embed the query (or reuse pre-computed embedding)
      let queryEmbedding: number[];
      if (precomputedEmbedding) {
        queryEmbedding = precomputedEmbedding;
        console.log("[GuidelineService] Using pre-computed embedding");
      } else {
        const embedStart = performance.now();
        const result = await embed({
          model: embeddingModel,
          value: query,
          providerOptions: EMBEDDING_OPTS,
        });
        queryEmbedding = result.embedding;
        console.log(
          `[GuidelineService] Embed query: ${(performance.now() - embedStart).toFixed(0)}ms`,
        );
      }

      // 2. Build vector query
      const searchStart = performance.now();
      let baseQuery = db.collection(COLLECTION);

      if (category) {
        baseQuery = baseQuery.where("category", "==", category) as any;
      }

      // 3. Execute vector search
      const vectorQuery: VectorQuery = (baseQuery as any).findNearest({
        vectorField: "embedding",
        queryVector: queryEmbedding,
        limit: topK,
        distanceMeasure: "COSINE",
      });

      const snapshot = (await vectorQuery.get()) as VectorQuerySnapshot;

      console.log(
        `[GuidelineService] Vector search: ${(performance.now() - searchStart).toFixed(0)}ms (${snapshot.docs.length} results)`,
      );

      // 4. Map results
      const guidelines: GuidelineDocument[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as GuidelineDocument[];

      return guidelines;
    } catch (error) {
      console.error("[GuidelineService] Search failed:", error);
      return [];
    }
  }

  /**
   * Format guidelines into a prompt section.
   */
  formatForPrompt(guidelines: GuidelineDocument[]): string {
    if (guidelines.length === 0) {
      return "";
    }

    const sections = guidelines.map((g) => {
      return `### ${g.category}: ${g.condition} (${g.source})
${g.content}`;
    });

    return `## Relevant Clinical Guidelines\n\n${sections.join("\n\n")}`;
  }
}

export const guidelineService = new GuidelineService();
