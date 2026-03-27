import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const SymptomObservationSourceSchema = z.enum([
  "chat",
  "assessment",
  "doctor-note",
  "manual",
  "migration",
]);

export const SymptomObservationStateSchema = z.enum([
  "improving",
  "stable",
  "worsening",
]);

export type SymptomObservationSource = z.infer<
  typeof SymptomObservationSourceSchema
>;

export type SymptomObservationState = z.infer<
  typeof SymptomObservationStateSchema
>;

// ── Firestore document shape ──────────────────────────────────────────────────

export interface SymptomObservationDocument {
  userId: string;
  idempotencyKey?: string;
  conditionId?: string;
  sessionId?: string;
  assessmentId?: string;
  symptom: string;
  symptomLower: string;
  severity?: number;
  state?: SymptomObservationState;
  source: SymptomObservationSource;
  onset?: string;
  duration?: string;
  triggers?: string[];
  alleviators?: string[];
  associatedSymptoms?: string[];
  notes?: string;
  observedAt: Timestamp;
  recordedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── DTO — outbound ────────────────────────────────────────────────────────────

export interface SymptomObservationDto {
  id: string;
  userId: string;
  idempotencyKey?: string;
  conditionId?: string;
  sessionId?: string;
  assessmentId?: string;
  symptom: string;
  severity?: number;
  state?: SymptomObservationState;
  source: SymptomObservationSource;
  onset?: string;
  duration?: string;
  triggers?: string[];
  alleviators?: string[];
  associatedSymptoms?: string[];
  notes?: string;
  observedAt: string;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toSymptomObservationDto(
  id: string,
  doc: SymptomObservationDocument,
): SymptomObservationDto {
  return {
    id,
    userId: doc.userId,
    idempotencyKey: doc.idempotencyKey,
    conditionId: doc.conditionId,
    sessionId: doc.sessionId,
    assessmentId: doc.assessmentId,
    symptom: doc.symptom,
    severity: doc.severity,
    state: doc.state,
    source: doc.source,
    onset: doc.onset,
    duration: doc.duration,
    triggers: doc.triggers,
    alleviators: doc.alleviators,
    associatedSymptoms: doc.associatedSymptoms,
    notes: doc.notes,
    observedAt: doc.observedAt.toDate().toISOString(),
    recordedAt: doc.recordedAt.toDate().toISOString(),
    createdAt: doc.createdAt.toDate().toISOString(),
    updatedAt: doc.updatedAt.toDate().toISOString(),
  };
}

// ── DTO — inbound (create) ────────────────────────────────────────────────────

export const CreateSymptomObservationSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  idempotencyKey: z.string().min(1).max(200).optional(),
  conditionId: z.string().optional(),
  sessionId: z.string().optional(),
  assessmentId: z.string().optional(),
  symptom: z.string().trim().min(1, { message: "symptom is required" }),
  severity: z.number().int().min(0).max(10).optional(),
  state: SymptomObservationStateSchema.optional(),
  source: SymptomObservationSourceSchema.default("manual"),
  onset: z.string().optional(),
  duration: z.string().optional(),
  triggers: z.array(z.string()).optional(),
  alleviators: z.array(z.string()).optional(),
  associatedSymptoms: z.array(z.string()).optional(),
  notes: z.string().optional(),
  observedAt: z.string().datetime().optional(),
});

export type CreateSymptomObservationInput = z.infer<
  typeof CreateSymptomObservationSchema
>;

// ── DTO — inbound (list) ──────────────────────────────────────────────────────

export const ListSymptomObservationsSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  conditionId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  sortDir: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type ListSymptomObservationsInput = z.infer<
  typeof ListSymptomObservationsSchema
>;

export interface PaginatedSymptomObservations {
  observations: SymptomObservationDto[];
  nextCursor: string | null;
  totalCount?: number;
}

// ── DTO — inbound (delete) ────────────────────────────────────────────────────

export const DeleteSymptomObservationSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  observationId: z.string().min(1, { message: "observationId is required" }),
});

export type DeleteSymptomObservationInput = z.infer<
  typeof DeleteSymptomObservationSchema
>;
