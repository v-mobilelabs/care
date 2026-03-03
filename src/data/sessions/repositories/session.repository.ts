import {
  FieldValue,
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { FirebaseService } from "@/data/shared/service/firesbase.service";
import type { SessionDocument } from "../models/session.model";
import { toSessionDto } from "../models/session.model";
import type { SessionDto } from "../models/session.model";

const db = FirebaseService.getInstance().getDb();

// ── Path helpers ─────────────────────────────────────────────────────────────

const sessionsCol = (userId: string) =>
  db.collection(`users/${userId}/sessions`);

const sessionDoc = (userId: string, sessionId: string) =>
  sessionsCol(userId).doc(sessionId);

// ── Repository ────────────────────────────────────────────────────────────────

export const sessionRepository = {
  async create(
    userId: string,
    data: Pick<SessionDocument, "title"> & { dependentId?: string },
    id?: string,
  ): Promise<SessionDto> {
    const now = Timestamp.now();
    const doc: SessionDocument = {
      userId,
      ...(data.dependentId ? { dependentId: data.dependentId } : {}),
      title: data.title,
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    const ref = id ? sessionsCol(userId).doc(id) : sessionsCol(userId).doc();
    await ref.set(doc);
    return toSessionDto(ref.id, doc);
  },

  /**
   * Find an existing session or create it with the given explicit ID.
   * Used by the chat API when the client passes its own UUID.
   */
  async findOrCreate(
    userId: string,
    sessionId: string,
    data: Pick<SessionDocument, "title"> & { dependentId?: string },
  ): Promise<SessionDto> {
    const existing = await sessionRepository.findById(userId, sessionId);
    if (existing) return existing;
    return sessionRepository.create(userId, data, sessionId);
  },

  async findById(
    userId: string,
    sessionId: string,
  ): Promise<SessionDto | null> {
    const snap = await sessionDoc(userId, sessionId).get();
    if (!snap.exists) return null;
    return toSessionDto(snap.id, snap.data() as SessionDocument);
  },

  async list(
    userId: string,
    limit: number,
    dependentId?: string,
  ): Promise<SessionDto[]> {
    // Firestore can't query "field does not exist", so for self we fetch and
    // filter client-side (all legacy docs and new self-docs have no dependentId).
    if (!dependentId) {
      const snap = await sessionsCol(userId)
        .orderBy("updatedAt", "desc")
        .limit(limit)
        .get();
      return snap.docs
        .filter((d) => !(d.data() as SessionDocument).dependentId)
        .map((d: QueryDocumentSnapshot) =>
          toSessionDto(d.id, d.data() as SessionDocument),
        );
    }
    const snap = await sessionsCol(userId)
      .where("dependentId", "==", dependentId)
      .orderBy("updatedAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toSessionDto(d.id, d.data() as SessionDocument),
    );
  },

  async update(
    userId: string,
    sessionId: string,
    data: Partial<Pick<SessionDocument, "title">>,
  ): Promise<SessionDto | null> {
    const ref = sessionDoc(userId, sessionId);
    await ref.update({ ...data, updatedAt: FieldValue.serverTimestamp() });
    const updated = await ref.get();
    if (!updated.exists) return null;
    return toSessionDto(updated.id, updated.data() as SessionDocument);
  },

  /** Atomically increment messageCount and bump updatedAt. */
  async incrementMessageCount(
    userId: string,
    sessionId: string,
  ): Promise<void> {
    await sessionDoc(userId, sessionId).update({
      messageCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
  },

  async delete(userId: string, sessionId: string): Promise<void> {
    await sessionDoc(userId, sessionId).delete();
  },
};
