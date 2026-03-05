import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Firestore document shape ──────────────────────────────────────────────────

export interface ConditionDocument {
  userId: string;
  /** The chat session where this condition was detected */
  sessionId?: string;
  name: string;
  /** Lowercase name used for duplicate detection queries */
  nameLower?: string;
  icd10?: string;
  severity: "mild" | "moderate" | "severe" | "critical";
  status: "suspected" | "probable" | "confirmed";
  description: string;
  symptoms: string[];
  createdAt: Timestamp;
}

// ── DTO — outbound ────────────────────────────────────────────────────────────

export interface ConditionDto {
  id: string;
  userId: string;
  sessionId?: string;
  name: string;
  icd10?: string;
  severity: "mild" | "moderate" | "severe" | "critical";
  status: "suspected" | "probable" | "confirmed";
  description: string;
  symptoms: string[];
  createdAt: string; // ISO-8601
}

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toConditionDto(
  id: string,
  doc: ConditionDocument,
): ConditionDto {
  return {
    id,
    userId: doc.userId,
    sessionId: doc.sessionId,
    name: doc.name,
    icd10: doc.icd10,
    severity: doc.severity,
    status: doc.status,
    description: doc.description,
    symptoms: doc.symptoms,
    createdAt: doc.createdAt.toDate().toISOString(),
  };
}

// ── DTO — inbound (create) ────────────────────────────────────────────────────

export const CreateConditionSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  sessionId: z.string().optional(),
  name: z.string().min(1),
  icd10: z.string().optional(),
  severity: z.enum(["mild", "moderate", "severe", "critical"]),
  status: z.enum(["suspected", "probable", "confirmed"]),
  description: z.string().min(1),
  symptoms: z.array(z.string()),
});

export type CreateConditionInput = z.infer<typeof CreateConditionSchema>;

// ── DTO — inbound (list) ──────────────────────────────────────────────────────

export const ListConditionsSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  limit: z.number().int().min(1).max(100).optional().default(50),
});

export type ListConditionsInput = z.infer<typeof ListConditionsSchema>;

// ── DTO — inbound (delete) ────────────────────────────────────────────────────

export const DeleteConditionSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  conditionId: z.string().min(1, { message: "conditionId is required" }),
});

export type DeleteConditionInput = z.infer<typeof DeleteConditionSchema>;
