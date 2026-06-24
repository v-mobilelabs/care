import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Firestore document shape ──────────────────────────────────────────────────

export interface ConditionDocument {
  userId: string;
  /** The chat session that detected this condition */
  sessionId?: string;
  name: string;
  /** ICD-10 diagnostic code */
  icd10?: string;
  severity: "mild" | "moderate" | "severe";
  status: "active" | "resolved" | "chronic" | "suspected";
  description?: string;
  symptoms?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── DTO — outbound ────────────────────────────────────────────────────────────

export interface ConditionDto {
  id: string;
  userId: string;
  sessionId?: string;
  name: string;
  icd10?: string;
  severity: "mild" | "moderate" | "severe";
  status: "active" | "resolved" | "chronic" | "suspected";
  description?: string;
  symptoms?: string[];
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
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
    updatedAt: doc.updatedAt.toDate().toISOString(),
  };
}

// ── DTO — inbound (create) ────────────────────────────────────────────────────

export const CreateConditionSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  profileId: z.string().optional(),
  sessionId: z.string().optional(),
  name: z.string().min(1),
  icd10: z.string().optional(),
  severity: z.enum(["mild", "moderate", "severe"]).default("mild"),
  status: z
    .enum(["active", "resolved", "chronic", "suspected"])
    .default("active"),
  description: z.string().optional(),
  symptoms: z.array(z.string()).optional(),
});

export type CreateConditionInput = z.infer<typeof CreateConditionSchema>;

// ── DTO — inbound (list) ──────────────────────────────────────────────────────

export const ListConditionsSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  limit: z.number().int().min(1).max(200).optional().default(100),
});

export type ListConditionsInput = z.infer<typeof ListConditionsSchema>;

// ── DTO — inbound (delete) ────────────────────────────────────────────────────

export const DeleteConditionSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  conditionId: z.string().min(1, { message: "conditionId is required" }),
});

export type DeleteConditionInput = z.infer<typeof DeleteConditionSchema>;
