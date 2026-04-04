import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";
import type { SessionLiveConfig } from "./session-live-config";

export interface SessionGroundingEvaluation {
  stage: "initial" | "internal-repair" | "web-fallback" | "failed";
  reason: string;
  scores: {
    relevance: number;
    grounding: number;
    coverage: number;
    freshness: number;
    sourceTrust: number;
  };
}

export interface SessionGroundingCacheDocument {
  agentType: string;
  query: string;
  normalizedQuery: string;
  queryEmbedding?: number[];
  context: string;
  responseMode: "quick" | "full";
  hasAttachment?: boolean;
  evaluation?: SessionGroundingEvaluation;
  updatedAt: Timestamp;
}

// ── Firestore document shape ──────────────────────────────────────────────────

export interface SessionDocument {
  userId: string;
  /** Stored for reference; the authoritative scoping is the path: profiles/{profileId}/sessions */
  profileId: string;
  title: string;
  /** Optional normalized title for future search/index migration. */
  titleLower?: string;
  messageCount: number;
  /** The last agent type that handled this session (persisted for cross-worker routing). */
  lastAgentType?: string;
  /** Denormalized one-line preview from the latest message in this session. */
  lastMessagePreview?: string;
  /** Accumulated token usage across all assistant messages in this session. */
  totalUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Latest strong grounding context available for reuse in this session. */
  groundingCache?: SessionGroundingCacheDocument[];
  /** Optional live session configuration and metadata. */
  liveConfig?: SessionLiveConfig;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── DTO — outbound (API responses) ───────────────────────────────────────────

export interface SessionDto {
  id: string;
  userId: string;
  profileId: string;
  title: string;
  messageCount: number;
  lastAgentType?: string;
  /** Denormalized one-line preview from the latest message in this session. */
  lastMessagePreview?: string;
  /** Accumulated token usage across all assistant messages in this session. */
  totalUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

// ── DTO — inbound (create) ────────────────────────────────────────────────────

export const CreateSessionSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  /** Firestore path segment: profiles/{profileId}/sessions */
  profileId: z.string().min(1, { message: "profileId is required" }),
  /** Optional explicit Firestore document ID (client-generated UUID). */
  id: z.uuid({ message: "id must be a valid UUID" }).optional(),
  title: z
    .string()
    .min(1, { message: "title must not be empty" })
    .max(120, { message: "title must be 120 characters or fewer" })
    .optional()
    .default("New Session"),
});

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;

// ── DTO — inbound (update) ────────────────────────────────────────────────────

export const UpdateSessionSchema = z.object({
  sessionId: z.string().min(1, { message: "sessionId is required" }),
  userId: z.string().min(1, { message: "userId is required" }),
  profileId: z.string().min(1, { message: "profileId is required" }),
  title: z
    .string()
    .min(1, { message: "title must not be empty" })
    .max(120, { message: "title must be 120 characters or fewer" }),
});

export type UpdateSessionInput = z.infer<typeof UpdateSessionSchema>;

// ── DTO — inbound (get / delete) ─────────────────────────────────────────────

export const SessionRefSchema = z.object({
  sessionId: z.string().min(1, { message: "sessionId is required" }),
  userId: z.string().min(1, { message: "userId is required" }),
  profileId: z.string().min(1, { message: "profileId is required" }),
});

export type SessionRefInput = z.infer<typeof SessionRefSchema>;

export const ListSessionsSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  profileId: z.string().min(1, { message: "profileId is required" }),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

export type ListSessionsInput = z.infer<typeof ListSessionsSchema>;

// ── DTO — inbound (paginated list) ────────────────────────────────────────────

export const ListSessionsPaginatedSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  profileId: z.string().min(1, { message: "profileId is required" }),
  limit: z.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
  agent: z.string().optional(),
  q: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type ListSessionsPaginatedInput = z.infer<
  typeof ListSessionsPaginatedSchema
>;

// ── Paginated response ────────────────────────────────────────────────────────

export interface PaginatedSessions {
  sessions: SessionDto[];
  nextCursor: string | null;
  totalCount?: number;
}

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toSessionDto(id: string, doc: SessionDocument): SessionDto {
  return {
    id,
    userId: doc.userId,
    profileId: doc.profileId,
    title: doc.title,
    messageCount: doc.messageCount,
    ...(doc.lastAgentType && { lastAgentType: doc.lastAgentType }),
    ...(doc.lastMessagePreview && {
      lastMessagePreview: doc.lastMessagePreview,
    }),
    ...(doc.totalUsage && { totalUsage: doc.totalUsage }),
    createdAt: doc.createdAt.toDate().toISOString(),
    updatedAt: doc.updatedAt.toDate().toISOString(),
  };
}
