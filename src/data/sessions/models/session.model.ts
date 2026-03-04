import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Firestore document shape ──────────────────────────────────────────────────

export interface SessionDocument {
  userId: string;
  /** Stored for reference; the authoritative scoping is the path:  users/{userId}/profiles/{profileId}/sessions */
  profileId: string;
  title: string;
  messageCount: number;
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
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

// ── DTO — inbound (create) ────────────────────────────────────────────────────

export const CreateSessionSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  /** Firestore path segment: users/{userId}/profiles/{profileId}/sessions */
  profileId: z.string().min(1, { message: "profileId is required" }),
  /** Optional explicit Firestore document ID (client-generated UUID). */
  id: z.string().uuid({ message: "id must be a valid UUID" }).optional(),
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

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toSessionDto(id: string, doc: SessionDocument): SessionDto {
  return {
    id,
    userId: doc.userId,
    profileId: doc.profileId,
    title: doc.title,
    messageCount: doc.messageCount,
    createdAt: doc.createdAt.toDate().toISOString(),
    updatedAt: doc.updatedAt.toDate().toISOString(),
  };
}
