import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Q&A pair ─────────────────────────────────────────────────────────────────

export interface QaPair {
  question: string;
  questionType: string;
  options?: string[];
  answer: string;
}

// ── Validated question (from AI-generated assessment skeleton) ────────────────

export interface ValidatedQuestion {
  question: string;
  type: "text" | "choice" | "scale" | "binary";
  options?: string[];
  rationale?: string;
}

export interface AssessmentActionCard {
  toolCallId?: string;
  title: string;
  items: string[];
  disclaimer?: string;
}

export type AssessmentStatus = "active" | "completed" | "abandoned";

// ── Firestore document shape ──────────────────────────────────────────────────

export interface AssessmentDocument {
  userId: string;
  /** The chat session that generated this assessment */
  sessionId: string;
  /** Unique assessment run id (usually toolCallId from startAssessment) */
  runId?: string;
  /** Agent selected for this assessment run (e.g. cardiology, nephrology) */
  specialtyAgent?: string;
  title: string;
  condition?: string;
  /** Primary guideline (legacy single guideline field) */
  guideline?: string;
  /** Full guideline set followed during assessment */
  guidelinesFollowed?: string[];
  estimatedQuestions?: number;
  estimatedMinutes?: string;
  /** Whether this assessment uses adaptive question logic */
  adaptiveMode?: boolean;
  /** Pre-generated + validated questions (if adaptiveMode = true) */
  validatedQuestions?: ValidatedQuestion[];
  status?: AssessmentStatus;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  riskLevel?: "low" | "moderate" | "high" | "emergency";
  summary?: string;
  actionCards?: AssessmentActionCard[];
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
  specialtyAgent?: string;
  title: string;
  condition?: string;
  guideline?: string;
  guidelinesFollowed?: string[];
  estimatedQuestions?: number;
  estimatedMinutes?: string;
  adaptiveMode?: boolean;
  validatedQuestions?: ValidatedQuestion[];
  status?: AssessmentStatus;
  startedAt?: string;
  completedAt?: string;
  riskLevel?: "low" | "moderate" | "high" | "emergency";
  summary?: string;
  actionCards?: AssessmentActionCard[];
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

// ── Validated question schema ─────────────────────────────────────────────────

const ValidatedQuestionSchema = z.object({
  question: z.string().min(10),
  type: z.enum(["text", "choice", "scale", "binary"]),
  options: z.array(z.string()).optional(),
  rationale: z.string().optional(),
});

const ActionCardSchema = z.object({
  toolCallId: z.string().min(1).optional(),
  title: z.string().min(1),
  items: z.array(z.string().min(1)).min(1).max(10),
  disclaimer: z.string().optional(),
});

// ── DTO — inbound (create) ────────────────────────────────────────────────────

export const CreateAssessmentSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  sessionId: z.string().min(1, { message: "sessionId is required" }),
  runId: z.string().min(1).optional(),
  specialtyAgent: z.string().min(1).optional(),
  title: z.string().min(1).max(120).optional().default("Clinical Assessment"),
  condition: z.string().optional(),
  guideline: z.string().optional(),
  guidelinesFollowed: z.array(z.string().min(1)).optional(),
  estimatedQuestions: z.number().int().min(1).max(30).optional(),
  estimatedMinutes: z.string().optional(),
  adaptiveMode: z.boolean().optional(),
  validatedQuestions: z.array(ValidatedQuestionSchema).optional(),
  status: z.enum(["active", "completed", "abandoned"]).optional(),
  startedAt: z.iso.datetime().optional(),
  completedAt: z.iso.datetime().optional(),
  riskLevel: z.enum(["low", "moderate", "high", "emergency"]).optional(),
  summary: z.string().optional(),
  actionCards: z.array(ActionCardSchema).optional().default([]),
  qa: z.array(QaPairSchema).optional().default([]),
});

export type CreateAssessmentInput = z.infer<typeof CreateAssessmentSchema>;

// ── DTO — inbound (list) ──────────────────────────────────────────────────────

export const ListAssessmentsSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  limit: z.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
  q: z.string().optional(),
  status: z.enum(["active", "completed", "abandoned"]).optional(),
  riskLevel: z.enum(["low", "moderate", "high", "emergency"]).optional(),
  agent: z.string().optional(),
  sortBy: z
    .enum(["createdAt", "title", "updatedAt"])
    .optional()
    .default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type ListAssessmentsInput = z.infer<typeof ListAssessmentsSchema>;

export interface PaginatedAssessments {
  assessments: AssessmentDto[];
  nextCursor: string | null;
  totalCount?: number;
}

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
    specialtyAgent: doc.specialtyAgent,
    title: doc.title,
    condition: doc.condition,
    guideline: doc.guideline,
    guidelinesFollowed: doc.guidelinesFollowed,
    estimatedQuestions: doc.estimatedQuestions,
    estimatedMinutes: doc.estimatedMinutes,
    status: doc.status,
    riskLevel: doc.riskLevel,
    summary: doc.summary,
    actionCards: doc.actionCards,
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
