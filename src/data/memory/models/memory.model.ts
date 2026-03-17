import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Firestore document shape ──────────────────────────────────────────────────

export interface MemoryDocument {
  userId: string;
  /** Category for grouping and filtering memories */
  category: MemoryCategory;
  /** The distilled fact / insight */
  content: string;
  /** Source session that produced this memory (if any) */
  sessionId?: string;
  /** Last time this memory was accessed/recalled */
  lastAccessedAt: Timestamp;
  createdAt: Timestamp;
}

export type MemoryCategory =
  | "medical"
  | "preference"
  | "lifestyle"
  | "allergy"
  | "summary";

// ── DTO — outbound (API / tool responses) ─────────────────────────────────────

export interface MemoryDto {
  id: string;
  userId: string;
  category: MemoryCategory;
  content: string;
  sessionId?: string;
  lastAccessedAt: string; // ISO-8601
  createdAt: string; // ISO-8601
}

// ── DTO — inbound (save memory) ───────────────────────────────────────────────

export const SaveMemorySchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  profileId: z.string().min(1, { message: "profileId is required" }),
  category: z.enum([
    "medical",
    "preference",
    "lifestyle",
    "allergy",
    "summary",
  ]),
  content: z
    .string()
    .min(1, { message: "content must not be empty" })
    .max(500, { message: "content must be 500 characters or fewer" }),
  sessionId: z.string().optional(),
});

export type SaveMemoryInput = z.infer<typeof SaveMemorySchema>;

// ── DTO — inbound (recall memories) ───────────────────────────────────────────

export const RecallMemoriesSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  profileId: z.string().min(1, { message: "profileId is required" }),
  category: z
    .enum(["medical", "preference", "lifestyle", "allergy", "summary"])
    .optional(),
  limit: z.number().int().min(1).max(50).optional().default(20),
});

export type RecallMemoriesInput = z.infer<typeof RecallMemoriesSchema>;

// ── DTO — inbound (delete) ────────────────────────────────────────────────────

export const DeleteMemorySchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  profileId: z.string().min(1, { message: "profileId is required" }),
  memoryId: z.string().min(1, { message: "memoryId is required" }),
});

export type DeleteMemoryInput = z.infer<typeof DeleteMemorySchema>;

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toMemoryDto(id: string, doc: MemoryDocument): MemoryDto {
  return {
    id,
    userId: doc.userId,
    category: doc.category,
    content: doc.content,
    sessionId: doc.sessionId,
    lastAccessedAt: doc.lastAccessedAt.toDate().toISOString(),
    createdAt: doc.createdAt.toDate().toISOString(),
  };
}
