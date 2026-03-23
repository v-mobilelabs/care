import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Nested schemas ────────────────────────────────────────────────────────────

const DiagnosisSchema = z.object({
  name: z.string().min(1),
  icd10: z.string().optional(),
  status: z.string().min(1),
});

const MedicationSchema = z.object({
  name: z.string().min(1),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
});

const VitalSchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().optional(),
});

// ── Nested types ──────────────────────────────────────────────────────────────

export type Diagnosis = z.infer<typeof DiagnosisSchema>;
export type Medication = z.infer<typeof MedicationSchema>;
export type Vital = z.infer<typeof VitalSchema>;

// ── Firestore document shape ──────────────────────────────────────────────────

export interface PatientSummaryDocument {
  userId: string;
  sessionId?: string;
  title: string;
  narrative: string;
  chiefComplaints: string[];
  diagnoses: Diagnosis[];
  medications: Medication[];
  vitals: Vital[];
  allergies: string[];
  riskFactors: string[];
  recommendations: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── DTO — outbound ────────────────────────────────────────────────────────────

export interface PatientSummaryDto {
  id: string;
  userId: string;
  sessionId?: string;
  title: string;
  narrative: string;
  chiefComplaints: string[];
  diagnoses: Diagnosis[];
  medications: Medication[];
  vitals: Vital[];
  allergies: string[];
  riskFactors: string[];
  recommendations: string[];
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toPatientSummaryDto(
  id: string,
  doc: PatientSummaryDocument,
): PatientSummaryDto {
  return {
    id,
    userId: doc.userId,
    ...(doc.sessionId ? { sessionId: doc.sessionId } : {}),
    title: doc.title,
    narrative: doc.narrative,
    chiefComplaints: doc.chiefComplaints,
    diagnoses: doc.diagnoses,
    medications: doc.medications,
    vitals: doc.vitals,
    allergies: doc.allergies,
    riskFactors: doc.riskFactors,
    recommendations: doc.recommendations,
    createdAt: doc.createdAt.toDate().toISOString(),
    updatedAt: doc.updatedAt.toDate().toISOString(),
  };
}

// ── DTO — inbound (create) ────────────────────────────────────────────────────

export const CreatePatientSummarySchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  sessionId: z.string().optional(),
  title: z.string().min(1),
  narrative: z.string().min(1),
  chiefComplaints: z.array(z.string()).default([]),
  diagnoses: z.array(DiagnosisSchema).default([]),
  medications: z.array(MedicationSchema).default([]),
  vitals: z.array(VitalSchema).default([]),
  allergies: z.array(z.string()).default([]),
  riskFactors: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
});

export type CreatePatientSummaryInput = z.infer<
  typeof CreatePatientSummarySchema
>;

// ── DTO — inbound (list) ──────────────────────────────────────────────────────

export const ListPatientSummariesSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  limit: z.number().int().min(1).max(100).optional().default(50),
});

export type ListPatientSummariesInput = z.infer<
  typeof ListPatientSummariesSchema
>;

// ── DTO — inbound (delete) ────────────────────────────────────────────────────

export const DeletePatientSummarySchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  summaryId: z.string().min(1, { message: "summaryId is required" }),
});

export type DeletePatientSummaryInput = z.infer<
  typeof DeletePatientSummarySchema
>;
