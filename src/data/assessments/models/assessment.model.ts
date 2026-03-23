import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Q&A pair ─────────────────────────────────────────────────────────────────

export interface QaPair {
  question: string;
  questionType: string;
  options?: string[];
  answer: string;
}

export type AssessmentStatus = "active" | "completed" | "abandoned";

// ── Firestore document shape ──────────────────────────────────────────────────

export interface AssessmentDocument {
  userId: string;
  /** The chat session that generated this assessment */
  sessionId: string;
  /** Unique assessment run id (usually toolCallId from startAssessment) */
  runId?: string;
  title: string;
  condition?: string;
  guideline?: string;
  estimatedQuestions?: number;
  estimatedMinutes?: string;
  status?: AssessmentStatus;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
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
  runId?: string;
  title: string;
  condition?: string;
  guideline?: string;
  estimatedQuestions?: number;
  estimatedMinutes?: string;
  status?: AssessmentStatus;
  startedAt?: string;
  completedAt?: string;
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
  runId: z.string().min(1).optional(),
  title: z.string().min(1).max(120).optional().default("Clinical Assessment"),
  condition: z.string().optional(),
  guideline: z.string().optional(),
  estimatedQuestions: z.number().int().min(1).max(30).optional(),
  estimatedMinutes: z.string().optional(),
  status: z.enum(["active", "completed", "abandoned"]).optional(),
  startedAt: z.iso.datetime().optional(),
  completedAt: z.iso.datetime().optional(),
  riskLevel: z.enum(["low", "moderate", "high", "emergency"]).optional(),
  summary: z.string().optional(),
  qa: z.array(QaPairSchema).optional().default([]),
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

function toIsoTimestamp(ts?: Timestamp): string | undefined {
  return ts ? ts.toDate().toISOString() : undefined;
}

function toAssessmentTiming(doc: AssessmentDocument) {
  const startedAt = toIsoTimestamp(doc.startedAt);
  const completedAt = toIsoTimestamp(doc.completedAt);
  const updatedAt = toIsoTimestamp(doc.updatedAt);

  return {
    ...(startedAt ? { startedAt } : {}),
    ...(completedAt ? { completedAt } : {}),
    ...(updatedAt ? { updatedAt } : {}),
  };
}

function toAssessmentDetails(doc: AssessmentDocument) {
  return {
    runId: doc.runId,
    title: doc.title,
    condition: doc.condition,
    guideline: doc.guideline,
    estimatedQuestions: doc.estimatedQuestions,
    estimatedMinutes: doc.estimatedMinutes,
    status: doc.status,
    riskLevel: doc.riskLevel,
    summary: doc.summary,
    qa: doc.qa,
  };
}

export function toAssessmentDto(
  id: string,
  doc: AssessmentDocument,
): AssessmentDto {
  return {
    id,
    userId: doc.userId,
    sessionId: doc.sessionId,
    ...toAssessmentDetails(doc),
    ...toAssessmentTiming(doc),
    createdAt: doc.createdAt.toDate().toISOString(),
  };
}
