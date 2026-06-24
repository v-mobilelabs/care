import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Firestore document shape ──────────────────────────────────────────────────

export interface KBContextDocument {
  /** Unique context ID (same as sessionId) */
  contextId: string;
  /** User ID (Firebase Auth UID) */
  userId: string;
  /** Profile ID (patient's UID) */
  profileId: string;
  /** Session title for reference */
  sessionTitle: string;
  /** Context metadata */
  metadata: {
    createdAt: Timestamp;
    updatedAt: Timestamp;
    messageCount: number;
    documentCount: number;
  };
}

// ── DTO — outbound ────────────────────────────────────────────────────────────

export interface KBContextDto {
  contextId: string;
  userId: string;
  profileId: string;
  sessionTitle: string;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    messageCount: number;
    documentCount: number;
  };
}

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toKBContextDto(
  doc: KBContextDocument,
): KBContextDto {
  return {
    contextId: doc.contextId,
    userId: doc.userId,
    profileId: doc.profileId,
    sessionTitle: doc.sessionTitle,
    metadata: {
      createdAt: doc.metadata.createdAt.toDate(),
      updatedAt: doc.metadata.updatedAt.toDate(),
      messageCount: doc.metadata.messageCount,
      documentCount: doc.metadata.documentCount,
    },
  };
}

// ── DTO — inbound (create) ────────────────────────────────────────────────────

export const CreateKBContextSchema = z.object({
  contextId: z.string().min(1),
  userId: z.string().min(1),
  profileId: z.string().min(1),
  sessionTitle: z.string().min(1).optional(),
});

export type CreateKBContextInput = z.infer<typeof CreateKBContextSchema>;

// ── KB Context Document item ──────────────────────────────────────────────────

export interface KBContextDocumentItem {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Timestamp;
  toolOutputs?: Record<string, unknown>;
}

// ── Collection name ───────────────────────────────────────────────────────────

export const KB_CONTEXT_COLLECTION = "kb_contexts";
