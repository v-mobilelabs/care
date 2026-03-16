/**
 * Shared types for the RAG pipeline.
 * Extracted into a separate file to avoid circular dependencies between
 * rag.service.ts and reranking.service.ts.
 */

import type { Timestamp, FieldValue } from "firebase-admin/firestore";

// ── Document Chunk ─────────────────────────────────────────────────────────────

export interface DocumentChunk {
  id: string;
  userId: string;
  profileId: string;
  dependentId?: string;
  /** Document type for filtering */
  type:
    | "condition"
    | "medication"
    | "assessment"
    | "soap"
    | "vital"
    | "bloodtest"
    | "prescription"
    | "profile"
    | "patient";
  /** Source document reference */
  sourceId: string;
  /** Plain text content of this chunk */
  content: string;
  /** 768-dim embedding vector (stored as VectorValue in Firestore, number[] in memory) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  embedding: number[] | any; // VectorValue type not yet exported from firebase-admin
  /** Metadata for context reconstruction */
  metadata: Record<string, unknown>;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

// ── Search Result ─────────────────────────────────────────────────────────────

export interface SearchResult {
  chunk: DocumentChunk;
  score: number; // cosine similarity [0, 1]
}

// ── Search Options ─────────────────────────────────────────────────────────────

export interface SearchOptions {
  userId: string;
  dependentId?: string;
  /** Filter by document types */
  types?: DocumentChunk["type"][];
  /** Pre-computed query embedding vector (768-dim). Skips internal embed call when provided. */
  queryEmbedding?: number[];
  /** Max candidates for initial KNN vector search (default: 10 without reranking, 30 with) */
  limit?: number;
  /** Minimum similarity threshold [0, 1] for initial vector search (default: 0.5 without reranking, 0.4 with) */
  minScore?: number;
  /**
   * Enable reranking via AWS Bedrock Cohere Rerank after the initial vector search.
   * When true, `limit` should be larger (e.g. 30) to give the reranker more candidates.
   * Default: false
   */
  rerank?: boolean;
  /** Number of results after reranking (default: 10) */
  rerankTopK?: number;
  /** Minimum rerank score 0-1 (default: 0.5) */
  rerankMinScore?: number;
  /**
   * Minimum score as a ratio of the top result's score (0-1).
   * E.g. 0.85 keeps only results scoring ≥ 85% of the best match.
   */
  rerankMinScoreRatio?: number;
}
