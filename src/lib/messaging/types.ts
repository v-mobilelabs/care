/**
 * In-app direct messaging types.
 *
 * RTDB paths:
 *   /dm/{conversationId}/info      — conversation metadata
 *   /dm/{conversationId}/messages  — message list
 *   /dm/{conversationId}/typing    — per-user typing indicator
 *   /dm-inbox/{uid}/{conversationId} — per-user conversation index
 *
 * conversationId = `${doctorId}_${patientId}`
 */

/** Stored at /dm/{conversationId}/info */
export interface DmInfo {
  doctorId: string;
  patientId: string;
  doctorName: string;
  patientName: string;
  createdAt: number;
}

/** Stored at /dm/{conversationId}/messages/{pushId} */
export interface DmMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: number;
}

/** Stored at /dm-inbox/{uid}/{conversationId} */
export interface DmInboxEntry {
  conversationId: string;
  otherUid: string;
  otherName: string;
  lastMessage: string;
  lastMessageAt: number;
  /** Number of unread messages (0 = all read). */
  unread: number;
}
