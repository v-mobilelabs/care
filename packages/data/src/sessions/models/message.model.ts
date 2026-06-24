import { z } from "zod";
import type { UIMessage } from "ai";
import type { Timestamp } from "firebase-admin/firestore";
import type { AudioPart } from "./audio-part.model";

// ── Message kind discriminator ────────────────────────────────────────────────

export type MessageKind = "text" | "audio" | "image" | "document" | "mixed";

// ── Firestore document shape ──────────────────────────────────────────────────

export interface MessageDocument {
  sessionId: string;
  userId: string;
  role: "user" | "assistant";
  /** Discriminator for message content type — drives UI rendering */
  kind: MessageKind;
  /** JSON-serialised UIMessage parts array (text, tool, audio parts) */
  content: string;
  createdAt: Timestamp;
  /** Token usage from AI SDK (assistant messages only) */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** The specialist agent that produced this message (assistant messages only) */
  agentType?: string;
}

// ── DTO — outbound (API responses) ───────────────────────────────────────────

export interface MessageDto {
  id: string;
  sessionId: string;
  userId: string;
  role: "user" | "assistant";
  /** Message kind — text, audio, image, document, or mixed */
  kind: MessageKind;
  content: string;
  createdAt: string; // ISO-8601
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** The specialist agent that produced this message (assistant messages only) */
  agentType?: string;
}

// ── DTO — inbound (add message) ───────────────────────────────────────────────

export const AddMessageSchema = z.object({
  sessionId: z.string().min(1, { message: "sessionId is required" }),
  userId: z.string().min(1, { message: "userId is required" }),
  profileId: z.string().min(1, { message: "profileId is required" }),
  role: z.enum(["user", "assistant"], {
    error: "role must be 'user' or 'assistant'",
  }),
  /** Message kind discriminator — defaults to "text" */
  kind: z
    .enum(["text", "audio", "image", "document", "mixed"])
    .default("text")
    .optional(),
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
  /** The specialist agent that produced this message (assistant messages only) */
  agentType: z.string().optional(),
  /** Optional message ID — used to link audio and other artifacts. If not provided, Firestore auto-generates. */
  id: z.string().min(1, { message: "id must not be empty" }).optional(),
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
    kind: doc.kind,
    content: normalizeMessageContent(doc.content),
    createdAt: doc.createdAt.toDate().toISOString(),
    usage: doc.usage,
    ...(doc.agentType && { agentType: doc.agentType }),
  };
}

/** Parse a message's content string back into UIMessage parts. */
export function parseMessageContent(content: string): UIMessage["parts"] {
  try {
    const parsed = JSON.parse(content) as unknown;
    if (!Array.isArray(parsed)) {
      return [{ type: "text", text: content }];
    }
    return normalizeMessageParts(parsed as Array<Record<string, unknown>>);
  } catch {
    return [{ type: "text", text: content }];
  }
}

/**
 * Normalize persisted JSON message content to a stable UI parts shape.
 * This runs server-side when mapping Firestore documents to DTOs so all
 * API consumers receive consistent tool-part states after reload.
 */
export function normalizeMessageContent(content: string): string {
  try {
    const parsed = JSON.parse(content) as unknown;
    if (!Array.isArray(parsed)) return content;
    return JSON.stringify(normalizeMessageParts(parsed));
  } catch {
    return content;
  }
}

function normalizeMessageParts(
  parts: Array<Record<string, unknown>>,
): UIMessage["parts"] {
  return parts
    .map((p) => {
      // Audio parts pass through unchanged
      if (p.type === "audio") {
        return p as unknown as AudioPart;
      }

      // Legacy shape: { type: "tool-invocation", toolName, toolCallId, args/input, result/output }
      if (p.type === "tool-invocation" && typeof p.toolName === "string") {
        return {
          type: `tool-${p.toolName}`,
          toolCallId: p.toolCallId ?? "",
          state: "output-available",
          input: p.args ?? p.input ?? null,
          output: p.result ?? p.output ?? null,
        };
      }

      // Legacy / mixed state normalization: result -> output-available
      if (
        typeof p.type === "string" &&
        p.type.startsWith("tool-") &&
        p.state === "result"
      ) {
        return {
          ...p,
          state: "output-available",
          output: p.output ?? p.result ?? null,
        };
      }

      // Validate tool-* parts have required fields; drop malformed ones
      if (typeof p.type === "string" && p.type.startsWith("tool-")) {
        if (typeof p.toolCallId !== "string" || !p.toolCallId) {
          return null; // skip malformed tool part
        }
        const validStates = new Set([
          "input-available",
          "output-available",
          "output-error",
          "approval-requested",
          "approval-denied",
        ]);
        if (typeof p.state !== "string" || !validStates.has(p.state)) {
          return null; // skip tool part with invalid state
        }
      }

      return p;
    })
    .filter(Boolean) as UIMessage["parts"];
}

/** Convert a persisted MessageDto back to an AI SDK UIMessage. */
export function toUIMessage(dto: MessageDto): UIMessage {
  return {
    id: dto.id,
    role: dto.role,
    parts: parseMessageContent(dto.content),
  } as UIMessage;
}

/**
 * Infer message kind from parsed content parts.
 * Determines if message is purely text, contains audio, image, document, or mixed.
 */
export function inferMessageKind(parts: UIMessage["parts"]): MessageKind {
  if (!parts || parts.length === 0) return "text";

  const partTypes = new Set<string>();
  let hasAudio = false;
  let hasImage = false;
  let hasDocument = false;
  let hasText = false;

  for (const part of parts) {
    const partType = (part as Record<string, unknown>).type;
    if (typeof partType === "string") {
      partTypes.add(partType);

      if (partType === "audio") hasAudio = true;
      if (partType === "image") hasImage = true;
      if (partType === "document") hasDocument = true;
      if (partType === "text") hasText = true;
    }
  }

  // Determine primary kind
  if (partTypes.size > 2 || (partTypes.size > 1 && hasText)) {
    return "mixed";
  }
  if (hasAudio) return "audio";
  if (hasImage) return "image";
  if (hasDocument) return "document";
  return "text";
}

/**
 * Infer kind from content string (JSON-serialized parts).
 * Fallback when parts haven't been parsed yet.
 */
export function inferKindFromContent(content: string): MessageKind {
  try {
    const parts = parseMessageContent(content);
    return inferMessageKind(parts);
  } catch {
    return "text";
  }
}
