import {
  FieldValue,
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import {
  toSessionDto,
  type SessionDocument,
  type SessionDto,
  type PaginatedSessions,
} from "../models/session.model";

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

  async listPaginated(
    userId: string,
    profileId: string,
    limit: number,
    cursor?: string,
  ): Promise<PaginatedSessions> {
    let query = sessionsCol(userId, profileId).orderBy("updatedAt", "desc");

    if (cursor) {
      query = query.startAfter(Timestamp.fromDate(new Date(cursor)));
    }

    const snap = await query.limit(limit + 1).get();
    const docs = snap.docs as QueryDocumentSnapshot[];
    const hasMore = docs.length > limit;
    const page = hasMore ? docs.slice(0, limit) : docs;

    const sessions = page.map((d) =>
      toSessionDto(d.id, d.data() as SessionDocument),
    );

    const nextCursor = hasMore ? sessions.at(-1)!.updatedAt : null;

    let totalCount: number | undefined;
    if (!cursor) {
      const countSnap = await sessionsCol(userId, profileId).count().get();
      totalCount = countSnap.data().count;
    }

    return { sessions, nextCursor, totalCount };
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

  /** Atomically accumulate token usage on the session document. */
  async incrementTotalUsage(
    userId: string,
    profileId: string,
    sessionId: string,
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    },
  ): Promise<void> {
    await sessionDoc(userId, profileId, sessionId).update({
      "totalUsage.promptTokens": FieldValue.increment(usage.promptTokens),
      "totalUsage.completionTokens": FieldValue.increment(
        usage.completionTokens,
      ),
      "totalUsage.totalTokens": FieldValue.increment(usage.totalTokens),
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
    // Use set+merge instead of update so this succeeds even when the session
    // document hasn't been created yet (e.g. routeSpecialist runs during
    // streaming, before the after() block creates the session document).
    await sessionDoc(userId, profileId, sessionId).set(
      { lastAgentType: agentType, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  },

  async delete(
    userId: string,
    profileId: string,
    sessionId: string,
  ): Promise<void> {
    await sessionDoc(userId, profileId, sessionId).delete();
  },
};
