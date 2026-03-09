import {
  ref,
  push,
  update,
  get,
  set,
  increment,
  serverTimestamp,
} from "firebase/database";
import { getClientDatabase } from "@/lib/firebase/client";
import { buildConversationId } from "./conversation-id";

// Re-export for backward compatibility — prefer importing directly from
// "@/lib/messaging/conversation-id" in server/shared code.
export { buildConversationId } from "./conversation-id";

// ── Start / get conversation ──────────────────────────────────────────────────

/**
 * Start a conversation (or return the existing conversationId if it already
 * exists). Creates both RTDB nodes: `/dm/{id}/info` and `/dm-inbox/{uid}/…`.
 */
export async function startConversation(params: {
  doctorId: string;
  patientId: string;
  doctorName: string;
  patientName: string;
}): Promise<string> {
  const { doctorId, patientId, doctorName, patientName } = params;
  const convId = buildConversationId(doctorId, patientId);
  const db = getClientDatabase();

  // Fast-path: conversation already exists.
  const infoSnap = await get(ref(db, `dm/${convId}/info`));
  if (infoSnap.exists()) return convId;

  // Step 1 — create the conversation info (must exist before inbox writes
  // so that RTDB rules can verify participant membership).
  await set(ref(db, `dm/${convId}/info`), {
    doctorId,
    patientId,
    doctorName,
    patientName,
    createdAt: serverTimestamp(),
  });

  // Step 2 — seed both users' inbox entries.
  const now = serverTimestamp();
  const updates: Record<string, unknown> = {};
  updates[`dm-inbox/${doctorId}/${convId}`] = {
    otherUid: patientId,
    otherName: patientName,
    lastMessage: "",
    lastMessageAt: now,
    unread: 0,
  };
  updates[`dm-inbox/${patientId}/${convId}`] = {
    otherUid: doctorId,
    otherName: doctorName,
    lastMessage: "",
    lastMessageAt: now,
    unread: 0,
  };
  await update(ref(db), updates);

  return convId;
}

// ── Send message ──────────────────────────────────────────────────────────────

/**
 * Send a text message and update both participants' inbox entries atomically.
 */
export async function sendMessage(params: {
  conversationId: string;
  senderId: string;
  recipientId: string;
  text: string;
}): Promise<void> {
  const { conversationId, senderId, recipientId, text } = params;
  const db = getClientDatabase();

  const newMsgKey = push(ref(db, `dm/${conversationId}/messages`)).key;
  if (!newMsgKey) throw new Error("Failed to generate push key");

  const now = serverTimestamp();
  const updates: Record<string, unknown> = {};

  // The message itself
  updates[`dm/${conversationId}/messages/${newMsgKey}`] = {
    senderId,
    text,
    createdAt: now,
  };

  // Sender inbox — mark as read
  updates[`dm-inbox/${senderId}/${conversationId}/lastMessage`] = text;
  updates[`dm-inbox/${senderId}/${conversationId}/lastMessageAt`] = now;
  updates[`dm-inbox/${senderId}/${conversationId}/unread`] = 0;

  // Recipient inbox — increment unread count
  updates[`dm-inbox/${recipientId}/${conversationId}/lastMessage`] = text;
  updates[`dm-inbox/${recipientId}/${conversationId}/lastMessageAt`] = now;
  updates[`dm-inbox/${recipientId}/${conversationId}/unread`] = increment(1);

  await update(ref(db), updates);
}

// ── Mark as read ──────────────────────────────────────────────────────────────

/** Reset unread count to zero for the given user. */
export async function markAsRead(
  uid: string,
  conversationId: string,
): Promise<void> {
  const db = getClientDatabase();
  await set(ref(db, `dm-inbox/${uid}/${conversationId}/unread`), 0);
}
