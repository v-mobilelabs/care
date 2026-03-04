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

const messagesCol = (userId: string, profileId: string, sessionId: string) =>
  db.collection(
    `users/${userId}/profiles/${profileId}/sessions/${sessionId}/messages`,
  );

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
    data: Pick<MessageDocument, "role" | "content">,
  ): Promise<MessageDto> {
    const doc: MessageDocument = {
      sessionId,
      userId,
      role: data.role,
      content: data.content,
      createdAt: Timestamp.now(),
    };
    const ref = await messagesCol(userId, profileId, sessionId).add(doc);
    return toMessageDto(ref.id, doc);
  },

  async list(
    userId: string,
    profileId: string,
    sessionId: string,
    limit: number,
  ): Promise<MessageDto[]> {
    const snap = await messagesCol(userId, profileId, sessionId)
      .orderBy("createdAt", "asc")
      .limit(limit)
      .get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toMessageDto(d.id, d.data() as MessageDocument),
    );
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
};
