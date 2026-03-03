import {
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { FirebaseService } from "@/data/shared/service/firesbase.service";
import type { MessageDocument } from "../models/message.model";
import { toMessageDto } from "../models/message.model";
import type { MessageDto } from "../models/message.model";

const db = FirebaseService.getInstance().getDb();

// ── Path helpers ─────────────────────────────────────────────────────────────

const messagesCol = (userId: string, sessionId: string) =>
  db.collection(`users/${userId}/sessions/${sessionId}/messages`);

const messageDoc = (userId: string, sessionId: string, messageId: string) =>
  messagesCol(userId, sessionId).doc(messageId);

// ── Repository ────────────────────────────────────────────────────────────────

export const messageRepository = {
  async add(
    userId: string,
    sessionId: string,
    data: Pick<MessageDocument, "role" | "content">,
  ): Promise<MessageDto> {
    const doc: MessageDocument = {
      sessionId,
      userId,
      role: data.role,
      content: data.content,
      createdAt: Timestamp.now(),
    };
    const ref = await messagesCol(userId, sessionId).add(doc);
    return toMessageDto(ref.id, doc);
  },

  async list(
    userId: string,
    sessionId: string,
    limit: number,
  ): Promise<MessageDto[]> {
    const snap = await messagesCol(userId, sessionId)
      .orderBy("createdAt", "asc")
      .limit(limit)
      .get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toMessageDto(d.id, d.data() as MessageDocument),
    );
  },

  async findById(
    userId: string,
    sessionId: string,
    messageId: string,
  ): Promise<MessageDto | null> {
    const snap = await messageDoc(userId, sessionId, messageId).get();
    if (!snap.exists) return null;
    return toMessageDto(snap.id, snap.data() as MessageDocument);
  },

  async deleteAll(userId: string, sessionId: string): Promise<void> {
    const snap = await messagesCol(userId, sessionId).get();
    const batch = db.batch();
    snap.docs.forEach((d: QueryDocumentSnapshot) => batch.delete(d.ref));
    await batch.commit();
  },
};
