import {
  FieldValue,
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import type { SessionDocument } from "../models/session.model";
import { toSessionDto } from "../models/session.model";
import type { SessionDto } from "../models/session.model";

// ── Path helpers ─────────────────────────────────────────────────────────────

const sessionsCol = (userId: string, profileId: string) =>
  db.collection(`profiles/${profileId}/sessions`);

const sessionDoc = (userId: string, profileId: string, sessionId: string) =>
  sessionsCol(userId, profileId).doc(sessionId);

// ── Repository ────────────────────────────────────────────────────────────────

export const sessionRepository = {
  async create(
    userId: string,
    profileId: string,
    data: Pick<SessionDocument, "title">,
    id?: string,
  ): Promise<SessionDto> {
    const now = Timestamp.now();
    const doc: SessionDocument = {
      userId,
      profileId,
      title: data.title,
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    const ref = id
      ? sessionsCol(userId, profileId).doc(id)
      : sessionsCol(userId, profileId).doc();
    await ref.set(stripUndefined(doc));
    return toSessionDto(ref.id, doc);
  },

  /**
   * Find an existing session or create it with the given explicit ID.
   * Used by the chat API when the client passes its own UUID.
   */
  async findOrCreate(
    userId: string,
    profileId: string,
    sessionId: string,
    data: Pick<SessionDocument, "title">,
  ): Promise<SessionDto> {
    const existing = await sessionRepository.findById(
      userId,
      profileId,
      sessionId,
    );
    if (existing) {
      const DEFAULT_TITLE = "New Session";
      if (
        existing.title === DEFAULT_TITLE &&
        data.title &&
        data.title !== DEFAULT_TITLE
      ) {
        const updated = await sessionRepository.update(
          userId,
          profileId,
          sessionId,
          {
            title: data.title,
          },
        );
        return updated ?? existing;
      }
      return existing;
    }
    return sessionRepository.create(userId, profileId, data, sessionId);
  },

  async findById(
    userId: string,
    profileId: string,
    sessionId: string,
  ): Promise<SessionDto | null> {
    const snap = await sessionDoc(userId, profileId, sessionId).get();
    if (!snap.exists) return null;
    return toSessionDto(snap.id, snap.data() as SessionDocument);
  },

  async list(
    userId: string,
    profileId: string,
    limit: number,
  ): Promise<SessionDto[]> {
    const snap = await sessionsCol(userId, profileId)
      .orderBy("updatedAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toSessionDto(d.id, d.data() as SessionDocument),
    );
  },

  async update(
    userId: string,
    profileId: string,
    sessionId: string,
    data: Partial<Pick<SessionDocument, "title">>,
  ): Promise<SessionDto | null> {
    const ref = sessionDoc(userId, profileId, sessionId);
    await ref.update({ ...data, updatedAt: FieldValue.serverTimestamp() });
    const updated = await ref.get();
    if (!updated.exists) return null;
    return toSessionDto(updated.id, updated.data() as SessionDocument);
  },

  /** Atomically increment messageCount and bump updatedAt. */
  async incrementMessageCount(
    userId: string,
    profileId: string,
    sessionId: string,
  ): Promise<void> {
    await sessionDoc(userId, profileId, sessionId).update({
      messageCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
  },

  /** Persist the agent type that last handled this session. */
  async setLastAgentType(
    userId: string,
    profileId: string,
    sessionId: string,
    agentType: string,
  ): Promise<void> {
    await sessionDoc(userId, profileId, sessionId).update({
      lastAgentType: agentType,
      updatedAt: FieldValue.serverTimestamp(),
    });
  },

  async delete(
    userId: string,
    profileId: string,
    sessionId: string,
  ): Promise<void> {
    await sessionDoc(userId, profileId, sessionId).delete();
  },
};
