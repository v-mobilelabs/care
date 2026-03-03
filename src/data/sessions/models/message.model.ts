import { z } from "zod";
import type { UIMessage } from "ai";
import type { Timestamp } from "firebase-admin/firestore";

// ── Firestore document shape ──────────────────────────────────────────────────

export interface MessageDocument {
  sessionId: string;
  userId: string;
  role: "user" | "assistant";
  /** JSON-serialised UIMessage parts array */
  content: string;
  createdAt: Timestamp;
}

// ── DTO — outbound (API responses) ───────────────────────────────────────────

export interface MessageDto {
  id: string;
  sessionId: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string; // ISO-8601
}

// ── DTO — inbound (add message) ───────────────────────────────────────────────

export const AddMessageSchema = z.object({
  sessionId: z.string().min(1, { message: "sessionId is required" }),
  userId: z.string().min(1, { message: "userId is required" }),
  role: z.enum(["user", "assistant"], {
    error: "role must be 'user' or 'assistant'",
  }),
  /** UIMessage parts serialised to JSON string, or a plain text string */
  content: z.string().min(1, { message: "content must not be empty" }),
});

export type AddMessageInput = z.infer<typeof AddMessageSchema>;

// ── DTO — inbound (list messages) ────────────────────────────────────────────

export const ListMessagesSchema = z.object({
  sessionId: z.string().min(1, { message: "sessionId is required" }),
  userId: z.string().min(1, { message: "userId is required" }),
  limit: z.number().int().min(1).max(500).optional().default(200),
});

export type ListMessagesInput = z.infer<typeof ListMessagesSchema>;

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toMessageDto(id: string, doc: MessageDocument): MessageDto {
  return {
    id,
    sessionId: doc.sessionId,
    userId: doc.userId,
    role: doc.role,
    content: doc.content,
    createdAt: doc.createdAt.toDate().toISOString(),
  };
}

/** Parse a message's content string back into UIMessage parts. */
export function parseMessageContent(content: string): UIMessage["parts"] {
  try {
    return JSON.parse(content) as UIMessage["parts"];
  } catch {
    return [{ type: "text", text: content }];
  }
}
