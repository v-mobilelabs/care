import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Q&A pair ─────────────────────────────────────────────────────────────────

export interface QaPair {
  question: string;
  questionType: string;
  options?: string[];
  answer: string;
}

// ── Firestore document shape ──────────────────────────────────────────────────

export interface AssessmentDocument {
  userId: string;
  /** The chat session that generated this assessment */
  sessionId: string;
  title: string;
  condition?: string;
  riskLevel?: "low" | "moderate" | "high" | "emergency";
  summary?: string;
  qa: QaPair[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ── DTO — outbound ────────────────────────────────────────────────────────────

export interface AssessmentDto {
  id: string;
  userId: string;
  sessionId: string;
  title: string;
  condition?: string;
  riskLevel?: "low" | "moderate" | "high" | "emergency";
  summary?: string;
  qa: QaPair[];
  createdAt: string; // ISO-8601
  updatedAt?: string; // ISO-8601
}

// ── Q&A pair schema ───────────────────────────────────────────────────────────

const QaPairSchema = z.object({
  question: z.string().min(1),
  questionType: z.string().min(1),
  options: z.array(z.string()).optional(),
  answer: z.string().min(1),
});

// ── DTO — inbound (create) ────────────────────────────────────────────────────

export const CreateAssessmentSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  sessionId: z.string().min(1, { message: "sessionId is required" }),
  title: z.string().min(1).max(120).optional().default("Clinical Assessment"),
  condition: z.string().optional(),
  riskLevel: z.enum(["low", "moderate", "high", "emergency"]).optional(),
  summary: z.string().optional(),
  qa: z
    .array(QaPairSchema)
    .min(1, { message: "At least one Q&A pair is required" }),
});

export type CreateAssessmentInput = z.infer<typeof CreateAssessmentSchema>;

// ── DTO — inbound (list) ──────────────────────────────────────────────────────

export const ListAssessmentsSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  limit: z.number().int().min(1).max(100).optional().default(50),
});

export type ListAssessmentsInput = z.infer<typeof ListAssessmentsSchema>;

// ── DTO — inbound (get / delete) ──────────────────────────────────────────────

export const AssessmentRefSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  assessmentId: z.string().min(1, { message: "assessmentId is required" }),
});

export type AssessmentRefInput = z.infer<typeof AssessmentRefSchema>;

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toAssessmentDto(
  id: string,
  doc: AssessmentDocument,
): AssessmentDto {
  return {
    id,
    userId: doc.userId,
    sessionId: doc.sessionId,
    title: doc.title,
    condition: doc.condition,
    riskLevel: doc.riskLevel,
    summary: doc.summary,
    qa: doc.qa,
    createdAt: doc.createdAt.toDate().toISOString(),
    ...(doc.updatedAt
      ? { updatedAt: doc.updatedAt.toDate().toISOString() }
      : {}),
  };
}
