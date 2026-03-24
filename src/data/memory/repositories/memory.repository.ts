import {
  FieldValue,
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { scopedCol } from "@/data/shared/repositories/scoped-col";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import {
  toMemoryDto,
  type MemoryDto,
  type MemoryDocument,
  type MemoryCategory,
} from "../models/memory.model";

// ── Path helpers ─────────────────────────────────────────────────────────────

/** `profiles/{profileId}/memories` */
const memoriesCol = (profileId: string) => scopedCol(profileId, "memories");

const memoryDoc = (profileId: string, memoryId: string) =>
  memoriesCol(profileId).doc(memoryId);

/** Maximum number of memories per profile (prevents unbounded growth). */
const MAX_MEMORIES_PER_PROFILE = 50;

/** Enforce cap — delete oldest memory if at limit. */
async function evictIfAtCap(profileId: string): Promise<void> {
  const existing = await memoriesCol(profileId)
    .orderBy("createdAt", "asc")
    .get();
  if (existing.size >= MAX_MEMORIES_PER_PROFILE) {
    const oldest = existing.docs[0];
    if (oldest) await oldest.ref.delete();
  }
}

// ── Repository ────────────────────────────────────────────────────────────────

export const memoryRepository = {
  async save(
    userId: string,
    profileId: string,
    data: Pick<MemoryDocument, "category" | "content" | "sessionId">,
  ): Promise<MemoryDto> {
    await evictIfAtCap(profileId);
    const now = Timestamp.now();
    const doc: MemoryDocument = {
      userId,
      category: data.category,
      content: data.content,
      ...(data.sessionId && { sessionId: data.sessionId }),
      lastAccessedAt: now,
      createdAt: now,
    };
    const ref = await memoriesCol(profileId).add(stripUndefined(doc));
    return toMemoryDto(ref.id, doc);
  },

  async list(
    profileId: string,
    limit: number,
    category?: MemoryCategory,
  ): Promise<MemoryDto[]> {
    let query = memoriesCol(profileId).orderBy("createdAt", "desc");
    if (category) {
      query = query.where("category", "==", category);
    }
    const snap = await query.limit(limit).get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toMemoryDto(d.id, d.data() as MemoryDocument),
    );
  },

  async listAll(profileId: string): Promise<MemoryDto[]> {
    const snap = await memoriesCol(profileId)
      .orderBy("createdAt", "desc")
      .limit(MAX_MEMORIES_PER_PROFILE)
      .get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toMemoryDto(d.id, d.data() as MemoryDocument),
    );
  },

  async listAllByCategory(
    profileId: string,
    category: MemoryCategory,
  ): Promise<MemoryDto[]> {
    const snap = await memoriesCol(profileId)
      .where("category", "==", category)
      .limit(MAX_MEMORIES_PER_PROFILE)
      .get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toMemoryDto(d.id, d.data() as MemoryDocument),
    );
  },

  async count(profileId: string, category?: MemoryCategory): Promise<number> {
    const col = memoriesCol(profileId);
    const query = category ? col.where("category", "==", category) : col;
    const countSnap = await query.count().get();
    return countSnap.data().count;
  },

  /** Touch `lastAccessedAt` on recalled memories so eviction can use recency. */
  async touchAccessed(profileId: string, memoryIds: string[]): Promise<void> {
    if (memoryIds.length === 0) return;
    const col = memoriesCol(profileId);
    const batch = col.firestore.batch();
    for (const id of memoryIds) {
      batch.update(col.doc(id), {
        lastAccessedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  },

  async delete(profileId: string, memoryId: string): Promise<void> {
    await memoryDoc(profileId, memoryId).delete();
  },

  async deleteMany(
    profileId: string,
    memoryIds: readonly string[],
  ): Promise<void> {
    if (memoryIds.length === 0) return;
    const col = memoriesCol(profileId);
    const batch = col.firestore.batch();
    for (const id of memoryIds) {
      batch.delete(col.doc(id));
    }
    await batch.commit();
  },

  async deleteAll(profileId: string): Promise<void> {
    const snap = await memoriesCol(profileId).get();
    if (snap.empty) return;
    const batch = memoriesCol(profileId).firestore.batch();
    snap.docs.forEach((d: QueryDocumentSnapshot) => batch.delete(d.ref));
    await batch.commit();
  },
};
