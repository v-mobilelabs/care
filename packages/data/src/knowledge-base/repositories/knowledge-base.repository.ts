import {
  Timestamp,
  type Query,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import {
  KB_COLLECTION,
  toKnowledgeBaseDto,
  type KnowledgeBaseDocument,
  type KnowledgeBaseDto,
  type PaginatedKnowledgeBase,
  type KBEntryType,
  type KBStatus,
} from "../models/knowledge-base.model";

const col = () => db.collection(KB_COLLECTION);

export const knowledgeBaseRepository = {
  async create(
    data: Omit<KnowledgeBaseDocument, "createdAt" | "updatedAt" | "embedding">,
  ): Promise<KnowledgeBaseDto> {
    const now = Timestamp.now();
    const doc: Omit<KnowledgeBaseDocument, "embedding"> & {
      createdAt: Timestamp;
      updatedAt: Timestamp;
    } = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    const ref = col().doc();
    await ref.set(stripUndefined(doc as Record<string, unknown>));
    return toKnowledgeBaseDto(ref.id, {
      ...doc,
      embedding: [],
    } as KnowledgeBaseDocument);
  },

  async findById(entryId: string): Promise<KnowledgeBaseDto | null> {
    const snap = await col().doc(entryId).get();
    if (!snap.exists) return null;
    return toKnowledgeBaseDto(snap.id, snap.data() as KnowledgeBaseDocument);
  },

  async update(
    entryId: string,
    data: Partial<Omit<KnowledgeBaseDocument, "createdAt" | "embedding">>,
  ): Promise<KnowledgeBaseDto | null> {
    const ref = col().doc(entryId);
    const snap = await ref.get();
    if (!snap.exists) return null;

    await ref.update(
      stripUndefined({
        ...data,
        updatedAt: Timestamp.now(),
      } as Record<string, unknown>),
    );

    const updated = await ref.get();
    return toKnowledgeBaseDto(
      updated.id,
      updated.data() as KnowledgeBaseDocument,
    );
  },

  async delete(entryId: string): Promise<void> {
    await col().doc(entryId).delete();
  },

  async list(opts: {
    limit: number;
    cursor?: string;
    category?: string;
    type?: KBEntryType;
    status?: KBStatus;
  }): Promise<PaginatedKnowledgeBase> {
    let query: Query = col();

    if (opts.status) {
      query = query.where("status", "==", opts.status);
    }
    if (opts.category) {
      query = query.where("category", "==", opts.category);
    }
    if (opts.type) {
      query = query.where("type", "==", opts.type);
    }

    query = query.orderBy("createdAt", "desc");

    if (opts.cursor) {
      query = query.startAfter(Timestamp.fromDate(new Date(opts.cursor)));
    }

    const snap = await query.limit(opts.limit + 1).get();
    const docs = snap.docs.map((d: QueryDocumentSnapshot) =>
      toKnowledgeBaseDto(d.id, d.data() as KnowledgeBaseDocument),
    );

    const hasMore = docs.length > opts.limit;
    const page = hasMore ? docs.slice(0, opts.limit) : docs;
    const nextCursor = hasMore ? page[page.length - 1].createdAt : null;

    // Total count only on first page
    let totalCount: number | undefined;
    if (!opts.cursor) {
      let countQuery: Query = col();
      if (opts.status)
        countQuery = countQuery.where("status", "==", opts.status);
      if (opts.category)
        countQuery = countQuery.where("category", "==", opts.category);
      if (opts.type) countQuery = countQuery.where("type", "==", opts.type);
      const countSnap = await countQuery.count().get();
      totalCount = countSnap.data().count;
    }

    return { entries: page, nextCursor, totalCount };
  },

  async findByCategory(category: string): Promise<KnowledgeBaseDto[]> {
    const snap = await col()
      .where("category", "==", category)
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toKnowledgeBaseDto(d.id, d.data() as KnowledgeBaseDocument),
    );
  },
};
