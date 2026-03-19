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
  /** Token usage from AI SDK (assistant messages only) */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ── DTO — outbound (API responses) ───────────────────────────────────────────

export interface MessageDto {
  id: string;
  sessionId: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string; // ISO-8601
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ── DTO — inbound (add message) ───────────────────────────────────────────────

export const AddMessageSchema = z.object({
  sessionId: z.string().min(1, { message: "sessionId is required" }),
  userId: z.string().min(1, { message: "userId is required" }),
  profileId: z.string().min(1, { message: "profileId is required" }),
  role: z.enum(["user", "assistant"], {
    error: "role must be 'user' or 'assistant'",
  }),
  /** UIMessage parts serialised to JSON string, or a plain text string */
  content: z.string().min(1, { message: "content must not be empty" }),
  /** Token usage from AI SDK (assistant messages only) */
  usage: z
    .object({
      promptTokens: z.number().int().nonnegative(),
      completionTokens: z.number().int().nonnegative(),
      totalTokens: z.number().int().nonnegative(),
    })
    .optional(),
});

export type AddMessageInput = z.infer<typeof AddMessageSchema>;

// ── DTO — inbound (list messages) ────────────────────────────────────────────

export const ListMessagesSchema = z.object({
  sessionId: z.string().min(1, { message: "sessionId is required" }),
  userId: z.string().min(1, { message: "userId is required" }),
  profileId: z.string().min(1, { message: "profileId is required" }),
  limit: z.number().int().min(1).max(100).optional().default(20),
  /** ISO-8601 cursor — fetch messages older than this timestamp. */
  cursor: z.string().optional(),
});

export type ListMessagesInput = z.infer<typeof ListMessagesSchema>;

// ── Paginated response ─────────────────────────────────────────────────────────

export interface PaginatedMessages {
  messages: MessageDto[];
  /** ISO-8601 timestamp of the oldest message in this page, or null if no more pages. */
  nextCursor: string | null;
}

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toMessageDto(id: string, doc: MessageDocument): MessageDto {
  return {
    id,
    sessionId: doc.sessionId,
    userId: doc.userId,
    role: doc.role,
    content: doc.content,
    createdAt: doc.createdAt.toDate().toISOString(),
    usage: doc.usage,
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

/** Convert a persisted MessageDto back to an AI SDK UIMessage. */
export function toUIMessage(dto: MessageDto): UIMessage {
  return {
    id: dto.id,
    role: dto.role,
    parts: parseMessageContent(dto.content),
  } as UIMessage;
}
