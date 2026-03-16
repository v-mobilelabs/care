/**
 * RAG Service — Semantic search & retrieval for patient medical records.
 *
 * Architecture:
 * 1. Documents (conditions, meds, assessments, SOAP notes) → chunked & embedded
 * 2. Embeddings stored in Firestore with VectorValue fields
 * 3. Query → embedding → Firestore KNN vector search (not in-memory)
 * 4. (Optional) AWS Bedrock Cohere Rerank scores candidates for precision
 * 5. Top-k relevant chunks → context for LLM
 *
 * Uses Google's gemini-embedding-001 model (768 dimensions) + Firestore native vector search.
 */

import { embed, embedMany } from "ai";
import { google } from "@ai-sdk/google";
import { db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { rerankingService } from "./reranking.service";

// ── Shared types (re-exported for backward compatibility) ─────────────────────
export type { DocumentChunk, SearchResult, SearchOptions } from "./rag.types";
import type { DocumentChunk, SearchResult, SearchOptions } from "./rag.types";

// ── Embedding Model ───────────────────────────────────────────────────────────
// gemini-embedding-001 defaults to 3072 dims; truncate to 768 to match Firestore index.
const embeddingModel = google.embedding("gemini-embedding-001");
const EMBEDDING_OPTS = { google: { outputDimensionality: 768 } } as const;

// ── Firestore Collection ──────────────────────────────────────────────────────

const chunksCollection = (profileId?: string) => {
  if (!profileId)
    throw new Error("profileId is required for embeddings subcollection");
  return db.collection("profiles").doc(profileId).collection("embeddings");
};

// ── RAG Service ───────────────────────────────────────────────────────────────

export class RAGService {
  /**
   * Embed a query string into a 768-dim vector.
   * Exposed so callers can embed once and pass the vector to multiple services.
   */
  async embedQuery(query: string): Promise<number[]> {
    const { embedding } = await embed({
      model: embeddingModel,
      value: query,
      providerOptions: EMBEDDING_OPTS,
    });
    return embedding;
  }

  /**
   * Embed and index a single document (condition, med, assessment, etc.)
   * Splits long content into chunks if needed (max 512 tokens per chunk).
   * Uses Firestore VectorValue for native KNN search.
   */
  async indexDocument(params: {
    userId: string;
    profileId: string;
    dependentId?: string;
    type: DocumentChunk["type"];
    sourceId: string;
    content: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const chunks = this.chunkText(params.content, 512);

    // Generate embeddings for all chunks in parallel
    const { embeddings } = await embedMany({
      model: embeddingModel,
      values: chunks,
      providerOptions: EMBEDDING_OPTS,
    });

    // Write chunks to Firestore with VectorValue
    const batch = db.batch();
    for (let i = 0; i < chunks.length; i++) {
      const docRef = chunksCollection(params.profileId).doc();
      const chunk: DocumentChunk = {
        id: docRef.id,
        userId: params.userId,
        profileId: params.profileId,
        ...(params.dependentId !== undefined && {
          dependentId: params.dependentId,
        }),
        type: params.type,
        sourceId: params.sourceId,
        content: chunks[i],
        embedding: FieldValue.vector(embeddings[i]), // Native VectorValue
        metadata: params.metadata ?? {},
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      batch.set(docRef, chunk);
    }
    console.log(
      `[RAG Indexing] Indexed ${chunks.length} chunks for sourceId: ${params.sourceId}`,
    );
    await batch.commit();
  }

  /**
   * Remove all indexed chunks for a specific document.
   */
  async removeDocument(params: {
    userId: string;
    profileId: string;
    sourceId: string;
  }): Promise<void> {
    const snapshot = await chunksCollection(params.profileId)
      .where("userId", "==", params.userId)
      .where("sourceId", "==", params.sourceId)
      .get();

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  /**
   * Semantic search: convert query to embedding → Firestore native KNN vector search.
   *
   * NOTE: This implementation uses the NEW findNearest() API introduced in firebase-admin >= 12.6.0.
   * If you see TypeScript errors, upgrade: npm install firebase-admin@latest
   *
   * Temporary fallback: If findNearest() is not available, uses client-side similarity.
   */
  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const startTime = performance.now();
    console.log("[RAG Search] Started");

    // 1. Embed the query (or reuse pre-computed embedding)
    let queryEmbedding: number[];
    if (options.queryEmbedding) {
      queryEmbedding = options.queryEmbedding;
      console.log("[RAG Search] Using pre-computed embedding");
    } else {
      const embedStart = performance.now();
      queryEmbedding = await this.embedQuery(query);
      console.log(
        `[RAG Search] Embed query: ${(performance.now() - embedStart).toFixed(0)}ms`,
      );
    }

    // 2. Build base query with filters
    const searchStart = performance.now();

    // profileId is required for subcollection
    if (!options.userId) throw new Error("userId is required for search");
    // For now, assume profileId === userId for backwards compatibility
    const profileId = options.userId;
    let baseQuery = chunksCollection(profileId).where(
      "userId",
      "==",
      options.userId,
    );

    if (options.dependentId) {
      baseQuery = baseQuery.where("dependentId", "==", options.dependentId);
    }

    if (options.types && options.types.length > 0) {
      baseQuery = baseQuery.where("type", "in", options.types);
    }

    const rerank = options.rerank ?? false;
    const rerankTopK = options.rerankTopK ?? 10;
    const rerankMinScore = options.rerankMinScore ?? 0.01;
    const rerankMinScoreRatio = options.rerankMinScoreRatio;

    // When reranking is on, cast a wider net for the initial KNN search
    const limit = options.limit ?? (rerank ? 30 : 10);
    const minScore = options.minScore ?? (rerank ? 0.4 : 0.5);

    // 3. Try native vector search (firebase-admin >= 12.6.0)
    // Uses composite vector indexes: userId+type+embedding and userId+dependentId+type+embedding
    // so Firestore handles filtering server-side.
    try {
      const vectorQuery = (baseQuery as any).findNearest(
        "embedding",
        FieldValue.vector(queryEmbedding),
        {
          limit,
          distanceMeasure: "COSINE",
          distanceResultField: "vector_distance",
        },
      );

      const snapshot = await vectorQuery.get();
      console.log(
        `[RAG Search] Native KNN: ${(performance.now() - searchStart).toFixed(0)}ms, docs: ${snapshot.size}`,
      );

      // If Firestore returned 0 docs, the vector index may still be building.
      // Fall through to the client-side similarity fallback.
      if (snapshot.size > 0) {
        const results: SearchResult[] = [];
        for (const doc of snapshot.docs) {
          const chunk = doc.data() as DocumentChunk & {
            vector_distance?: number;
          };
          const distance = chunk.vector_distance ?? 0;
          const score = 1 - distance;
          if (score >= minScore) {
            results.push({ chunk, score });
          }
        }

        results.sort((a, b) => b.score - a.score);
        const limited = results.slice(0, limit);

        console.log(
          `[RAG Search] Total: ${(performance.now() - startTime).toFixed(0)}ms, returned: ${limited.length}`,
        );
        return rerank
          ? rerankingService.rerank(query, limited, {
              topK: rerankTopK,
              minScore: rerankMinScore,
              minScoreRatio: rerankMinScoreRatio,
            })
          : limited;
      }

      console.warn(
        "[RAG Search] Native KNN returned 0 docs — index may still be building, falling back to client-side similarity",
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.warn("[RAG Search] Native vector search failed:", errorMessage);
    }

    // 4. Fallback: client-side similarity (for compatibility)
    baseQuery = baseQuery.limit(500); // Increased from 200 for better results
    const snapshot = await baseQuery.get();
    console.log(
      `[RAG Search] Fallback query: ${(performance.now() - searchStart).toFixed(0)}ms, docs: ${snapshot.size}`,
    );

    const results: SearchResult[] = [];
    for (const doc of snapshot.docs) {
      const chunk = doc.data() as DocumentChunk;
      // Handle both VectorValue and number[] for compatibility
      const embeddingArray = Array.isArray(chunk.embedding)
        ? chunk.embedding
        : (chunk.embedding?.toArray?.() ?? []);

      if (embeddingArray.length === queryEmbedding.length) {
        const score = this.cosineSimilarity(queryEmbedding, embeddingArray);
        if (score >= minScore) {
          results.push({ chunk, score });
        }
      }
    }

    results.sort((a, b) => b.score - a.score);
    const filtered = results.slice(0, limit);

    console.log(
      `[RAG Search] Total: ${(performance.now() - startTime).toFixed(0)}ms, returned: ${filtered.length}`,
    );

    if (rerank) {
      return rerankingService.rerank(query, filtered, {
        topK: rerankTopK,
        minScore: rerankMinScore,
        minScoreRatio: rerankMinScoreRatio,
      });
    }
    return filtered;
  }

  /**
   * Compute cosine similarity between two vectors.
   * Used as fallback when native vector search is not available.
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Build context string from search results for LLM injection.
   */
  buildContext(results: SearchResult[]): string {
    if (results.length === 0) {
      return "";
    }

    const sections: string[] = [
      "## PATIENT MEDICAL CONTEXT (from semantic search)",
      "",
      "The following is relevant historical data retrieved based on the user's current query:",
      "",
    ];

    for (const result of results) {
      const { chunk, score } = result;
      // Extract title safely from metadata or use sourceId as fallback
      const metaTitle = chunk.metadata.title;
      const title =
        typeof metaTitle === "string" ? metaTitle : String(chunk.sourceId);
      const lines = [
        `### [${chunk.type.toUpperCase()}] ${title}`,
        `Relevance: ${(score * 100).toFixed(1)}%`,
        chunk.content,
        "",
      ];
      sections.push(...lines);
    }

    return sections.join("\n");
  }

  /**
   * Split text into chunks of approximately `maxTokens` tokens.
   * Simple word-based splitting (approx 1 token ≈ 0.75 words).
   */
  private chunkText(text: string, maxTokens: number): string[] {
    const words = text.split(/\s+/);
    const maxWords = Math.floor(maxTokens * 0.75);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += maxWords) {
      chunks.push(words.slice(i, i + maxWords).join(" "));
    }

    return chunks;
  }
}

/** Singleton instance */
export const ragService = new RAGService();
