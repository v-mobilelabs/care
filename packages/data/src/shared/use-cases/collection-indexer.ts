/**
 * Collection Indexer — Embeds content and stores it directly in a named
 * top-level Firestore collection (with an `embedding` field on the document).
 *
 * Used by the base UseCase when @Indexable specifies a `collection` option.
 * Unlike ragService.indexDocument() which writes to profiles/{pid}/embeddings,
 * this writes to `db.collection(collectionName).doc(sourceId)`.
 */

import { embed } from "ai";
import { google } from "@/data/shared/service/vertex-provider";
import { db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import type { DocumentChunk } from "@/data/shared/service/rag/rag.types";

const embeddingModel = google.embedding("gemini-embedding-001");
const EMBEDDING_OPTS = { vertex: { outputDimensionality: 768 } } as const;

/**
 * Embed content and upsert the document in the named collection.
 * The embedding is stored as a VectorValue on the `embedding` field.
 */
export async function indexToCollection(params: {
  collection: string;
  sourceId: string;
  type: DocumentChunk["type"];
  content: string;
  metadata: Record<string, unknown>;
  /** Full result object — stored alongside the embedding for retrieval. */
  data: Record<string, unknown>;
}): Promise<void> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: params.content,
    providerOptions: EMBEDDING_OPTS,
  });

  const ref = db.collection(params.collection).doc(params.sourceId);
  await ref.set(
    {
      ...params.data,
      type: params.type,
      content: params.content,
      embedding: FieldValue.vector(embedding),
      metadata: params.metadata,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  console.log(
    `[CollectionIndexer] Indexed ${params.type} → ${params.collection}/${params.sourceId}`,
  );
}

/**
 * Remove a document from the named collection by sourceId.
 */
export async function removeFromCollection(
  collection: string,
  sourceId: string,
): Promise<void> {
  await db.collection(collection).doc(sourceId).delete();
  console.log(`[CollectionIndexer] Removed ${collection}/${sourceId}`);
}
