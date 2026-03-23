/**
 * Knowledge Base Service — Semantic search & CRUD for global platform knowledge.
 *
 * Stores entries in the top-level `knowledge_base` collection with embeddings
 * on the document itself (not in profiles/{pid}/embeddings).
 *
 * Uses gemini-embedding-001 (768 dims) + Firestore native vector search.
 */

import { embed } from "ai";
import { google } from "@ai-sdk/google";
import { db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { VectorQuery, VectorQuerySnapshot } from "@google-cloud/firestore";
import { knowledgeBaseRepository } from "../repositories/knowledge-base.repository";
import {
  KB_COLLECTION,
  toKnowledgeBaseDto,
  type KnowledgeBaseDocument,
  type KnowledgeBaseDto,
  type KBEntryType,
  type CreateKnowledgeBaseInput,
  type UpdateKnowledgeBaseInput,
  type PaginatedKnowledgeBase,
  type ListKnowledgeBaseInput,
  type KnowledgeBaseRefInput,
} from "../models/knowledge-base.model";

const embeddingModel = google.embedding("gemini-embedding-001");
const EMBEDDING_OPTS = { google: { outputDimensionality: 768 } } as const;

export interface KBSearchResult {
  entry: KnowledgeBaseDto;
  score: number;
}

export class KnowledgeBaseService {
  /**
   * Create an entry, generate embedding, and store in the knowledge_base collection.
   */
  async create(input: CreateKnowledgeBaseInput): Promise<KnowledgeBaseDto> {
    // 1. Create the doc (without embedding — the repository stores the base fields)
    const entry = await knowledgeBaseRepository.create({
      title: input.title,
      type: input.type,
      category: input.category,
      subcategory: input.subcategory,
      content: input.content,
      tags: input.tags ?? [],
      source: input.source,
      sourceUrl: input.sourceUrl,
      status: "active",
      metadata: input.metadata ?? {},
      file: input.file,
    });

    // 2. Generate embedding and update the document
    const embeddingText = this.buildEmbeddingText(input);
    const { embedding } = await embed({
      model: embeddingModel,
      value: embeddingText,
      providerOptions: EMBEDDING_OPTS,
    });

    await db
      .collection(KB_COLLECTION)
      .doc(entry.id)
      .update({ embedding: FieldValue.vector(embedding) });

    console.log(
      `[KnowledgeBaseService] Created & embedded entry: ${entry.id} (${input.type}/${input.category})`,
    );

    return entry;
  }

  /**
   * Update an entry. Re-generates the embedding if content changes.
   */
  async update(
    input: UpdateKnowledgeBaseInput,
  ): Promise<KnowledgeBaseDto | null> {
    const existing = await knowledgeBaseRepository.findById(input.entryId);
    if (!existing) return null;

    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.subcategory !== undefined)
      updateData.subcategory = input.subcategory;
    if (input.content !== undefined) updateData.content = input.content;
    if (input.tags !== undefined) updateData.tags = input.tags;
    if (input.source !== undefined) updateData.source = input.source;
    if (input.sourceUrl !== undefined) updateData.sourceUrl = input.sourceUrl;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;
    if (input.file !== undefined) updateData.file = input.file;

    const updated = await knowledgeBaseRepository.update(
      input.entryId,
      updateData,
    );

    // Re-embed if content, title, or category changed
    if (
      input.content !== undefined ||
      input.title !== undefined ||
      input.category !== undefined
    ) {
      const merged = { ...existing, ...updateData };
      const embeddingText = this.buildEmbeddingText(merged);
      const { embedding } = await embed({
        model: embeddingModel,
        value: embeddingText,
        providerOptions: EMBEDDING_OPTS,
      });
      await db
        .collection(KB_COLLECTION)
        .doc(input.entryId)
        .update({ embedding: FieldValue.vector(embedding) });
      console.log(`[KnowledgeBaseService] Re-embedded entry: ${input.entryId}`);
    }

    return updated;
  }

  async get(input: KnowledgeBaseRefInput): Promise<KnowledgeBaseDto | null> {
    return knowledgeBaseRepository.findById(input.entryId);
  }

  async list(input: ListKnowledgeBaseInput): Promise<PaginatedKnowledgeBase> {
    return knowledgeBaseRepository.list({
      limit: input.limit,
      cursor: input.cursor,
      category: input.category,
      type: input.type,
      status: input.status,
    });
  }

  async delete(input: KnowledgeBaseRefInput): Promise<void> {
    await knowledgeBaseRepository.delete(input.entryId);
  }

  /**
   * Semantic vector search over the knowledge_base collection.
   */
  async search(
    query: string,
    options: {
      topK?: number;
      category?: string;
      type?: KBEntryType;
      queryEmbedding?: number[];
    } = {},
  ): Promise<KBSearchResult[]> {
    const {
      topK = 5,
      category,
      type: entryType,
      queryEmbedding: precomputed,
    } = options;
    const startTime = performance.now();

    // 1. Embed the query
    let queryEmbedding: number[];
    if (precomputed) {
      queryEmbedding = precomputed;
    } else {
      const { embedding } = await embed({
        model: embeddingModel,
        value: query,
        providerOptions: EMBEDDING_OPTS,
      });
      queryEmbedding = embedding;
    }

    // 2. Build base query with filters
    let baseQuery = db
      .collection(KB_COLLECTION)
      .where("status", "==", "active");
    if (category) {
      baseQuery = baseQuery.where("category", "==", category) as ReturnType<
        typeof baseQuery.where
      >;
    }
    if (entryType) {
      baseQuery = baseQuery.where("type", "==", entryType) as ReturnType<
        typeof baseQuery.where
      >;
    }

    // 3. Native vector search
    const vectorQuery: VectorQuery = (baseQuery as any).findNearest({
      vectorField: "embedding",
      queryVector: queryEmbedding,
      limit: topK,
      distanceMeasure: "COSINE",
    });

    const snapshot = (await vectorQuery.get()) as VectorQuerySnapshot;

    console.log(
      `[KnowledgeBaseService] Search: ${(performance.now() - startTime).toFixed(0)}ms (${snapshot.docs.length} results)`,
    );

    return snapshot.docs.map((doc) => {
      const data = doc.data() as KnowledgeBaseDocument;
      return {
        entry: toKnowledgeBaseDto(doc.id, data),
        score: 1, // COSINE distance not returned in findNearest snapshot
      };
    });
  }

  /**
   * Format search results for LLM prompt injection.
   */
  formatForPrompt(results: KBSearchResult[]): string {
    if (results.length === 0) return "";

    const sections = results.map(({ entry }) => {
      const header = `### ${entry.category}${entry.subcategory ? ` > ${entry.subcategory}` : ""}: ${entry.title}`;
      const source = entry.source ? ` (${entry.source})` : "";
      return `${header}${source}\n${entry.content}`;
    });

    return `## Relevant Knowledge Base\n\n${sections.join("\n\n")}`;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private buildEmbeddingText(
    data: Partial<CreateKnowledgeBaseInput> & {
      title?: string;
      content?: string;
      category?: string;
    },
  ): string {
    return [
      data.title ?? "",
      data.category ?? "",
      data.subcategory ?? "",
      data.content ?? "",
      ...(data.tags ?? []),
      data.source ?? "",
    ]
      .filter(Boolean)
      .join(" ");
  }
}

export const knowledgeBaseService = new KnowledgeBaseService();
