import {
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import type { MessageDocument } from "../models/message.model";
import { toMessageDto } from "../models/message.model";
import type { MessageDto, PaginatedMessages } from "../models/message.model";

// ── Path helpers ─────────────────────────────────────────────────────────────

const messagesCol = (userId: string, profileId: string, sessionId: string) =>
  db.collection(`profiles/${profileId}/sessions/${sessionId}/messages`);

const messageDoc = (
  userId: string,
  profileId: string,
  sessionId: string,
  messageId: string,
) => messagesCol(userId, profileId, sessionId).doc(messageId);

// ── Repository ────────────────────────────────────────────────────────────────

export const messageRepository = {
  async add(
    userId: string,
    profileId: string,
    sessionId: string,
    data: Pick<MessageDocument, "role" | "content" | "usage">,
  ): Promise<MessageDto> {
    const doc: MessageDocument = {
      sessionId,
      userId,
      role: data.role,
      content: data.content,
      createdAt: Timestamp.now(),
      ...(data.usage && { usage: data.usage }),
    };
    const ref = await messagesCol(userId, profileId, sessionId).add(doc);
    return toMessageDto(ref.id, doc);
  },

  async list(
    userId: string,
    profileId: string,
    sessionId: string,
    limit: number,
    cursor?: string,
  ): Promise<PaginatedMessages> {
    let query = messagesCol(userId, profileId, sessionId).orderBy(
      "createdAt",
      "desc",
    );

    if (cursor) {
      query = query.startAfter(Timestamp.fromDate(new Date(cursor)));
    }

    // Fetch one extra to determine if there's a next page.
    const snap = await query.limit(limit + 1).get();
    const docs = snap.docs as QueryDocumentSnapshot[];
    const hasMore = docs.length > limit;
    const page = hasMore ? docs.slice(0, limit) : docs;

    // Reverse so results are oldest-first (ascending) for the client.
    const messages = page
      .map((d) => toMessageDto(d.id, d.data() as MessageDocument))
      .reverse();

    const nextCursor = hasMore
      ? messages[0].createdAt // oldest message on this page
      : null;

    return { messages, nextCursor };
  },

  async findById(
    userId: string,
    profileId: string,
    sessionId: string,
    messageId: string,
  ): Promise<MessageDto | null> {
    const snap = await messageDoc(
      userId,
      profileId,
      sessionId,
      messageId,
    ).get();
    if (!snap.exists) return null;
    return toMessageDto(snap.id, snap.data() as MessageDocument);
  },

  async deleteAll(
    userId: string,
    profileId: string,
    sessionId: string,
  ): Promise<void> {
    const snap = await messagesCol(userId, profileId, sessionId).get();
    const batch = db.batch();
    snap.docs.forEach((d: QueryDocumentSnapshot) => batch.delete(d.ref));
    await batch.commit();
  },

  /**
   * Fetch all messages for a session ordered oldest-first.
   * Used server-side so the AI agent gets the full conversation history
   * when the client sends only the latest message (server-managed persistence).
   */
  async listAllForSession(
    userId: string,
    profileId: string,
    sessionId: string,
  ): Promise<MessageDto[]> {
    const snap = await messagesCol(userId, profileId, sessionId)
      .orderBy("createdAt", "asc")
      .get();
    return (snap.docs as QueryDocumentSnapshot[]).map((d) =>
      toMessageDto(d.id, d.data() as MessageDocument),
    );
  },
};
