import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

export type PatientSummaryStatus = "active" | "pending_rebuild" | "error";

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

const SummaryActionItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  status: z.enum(["pending", "done", "skipped"]),
  updatedAt: z.string().min(1),
});

// ── Nested types ──────────────────────────────────────────────────────────────

export type Diagnosis = z.infer<typeof DiagnosisSchema>;
export type Medication = z.infer<typeof MedicationSchema>;
export type Vital = z.infer<typeof VitalSchema>;
export type SummaryActionItem = z.infer<typeof SummaryActionItemSchema>;

export interface PatientSummaryContent {
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
  actionItems: SummaryActionItem[];
}

// ── Firestore document shape ──────────────────────────────────────────────────

export interface PatientSummaryDocument {
  userId: string;
  version?: number;
  status?: PatientSummaryStatus;
  lastUpdatedBy?: string;
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
  actionItems: SummaryActionItem[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── DTO — outbound ────────────────────────────────────────────────────────────

export interface PatientSummaryDto {
  id: string;
  userId: string;
  version: number;
  status: PatientSummaryStatus;
  lastUpdatedBy?: string;
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
  actionItems: SummaryActionItem[];
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

// ── Mapper ────────────────────────────────────────────────────────────────────

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function normalizeDiagnoses(value: unknown): Diagnosis[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const diagnosis = item as Partial<Diagnosis>;
    if (typeof diagnosis.name !== "string" || diagnosis.name.length === 0) {
      return [];
    }
    if (typeof diagnosis.status !== "string" || diagnosis.status.length === 0) {
      return [];
    }

    return [
      {
        name: diagnosis.name,
        status: diagnosis.status,
        ...(typeof diagnosis.icd10 === "string"
          ? { icd10: diagnosis.icd10 }
          : {}),
      },
    ];
  });
}

function normalizeMedications(value: unknown): Medication[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const medication = item as Partial<Medication>;
    if (typeof medication.name !== "string" || medication.name.length === 0) {
      return [];
    }

    return [
      {
        name: medication.name,
        ...(typeof medication.dosage === "string"
          ? { dosage: medication.dosage }
          : {}),
        ...(typeof medication.frequency === "string"
          ? { frequency: medication.frequency }
          : {}),
      },
    ];
  });
}

function normalizeVitals(value: unknown): Vital[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const vital = item as Partial<Vital>;
    if (typeof vital.name !== "string" || vital.name.length === 0) {
      return [];
    }
    if (typeof vital.value !== "string" || vital.value.length === 0) {
      return [];
    }

    return [
      {
        name: vital.name,
        value: vital.value,
        ...(typeof vital.unit === "string" ? { unit: vital.unit } : {}),
      },
    ];
  });
}

function normalizeActionItems(value: unknown): SummaryActionItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const actionItem = item as Partial<SummaryActionItem>;
    if (typeof actionItem.id !== "string" || actionItem.id.length === 0) {
      return [];
    }
    if (typeof actionItem.text !== "string" || actionItem.text.length === 0) {
      return [];
    }
    if (
      actionItem.status !== "pending" &&
      actionItem.status !== "done" &&
      actionItem.status !== "skipped"
    ) {
      return [];
    }

    return [
      {
        id: actionItem.id,
        text: actionItem.text,
        status: actionItem.status,
        updatedAt:
          typeof actionItem.updatedAt === "string" &&
          actionItem.updatedAt.length > 0
            ? actionItem.updatedAt
            : new Date(0).toISOString(),
      },
    ];
  });
}

function toIsoString(timestamp: Timestamp | undefined): string {
  if (!timestamp || typeof timestamp.toDate !== "function") {
    return new Date(0).toISOString();
  }

  return timestamp.toDate().toISOString();
}

export function toPatientSummaryDto(
  id: string,
  doc: PatientSummaryDocument,
): PatientSummaryDto {
  return {
    id,
    userId: doc.userId,
    version: doc.version ?? 1,
    status: doc.status ?? "active",
    ...(doc.lastUpdatedBy ? { lastUpdatedBy: doc.lastUpdatedBy } : {}),
    ...(doc.sessionId ? { sessionId: doc.sessionId } : {}),
    title:
      typeof doc.title === "string" && doc.title.length > 0
        ? doc.title
        : "Patient Summary",
    narrative: typeof doc.narrative === "string" ? doc.narrative : "",
    chiefComplaints: normalizeStringArray(doc.chiefComplaints),
    diagnoses: normalizeDiagnoses(doc.diagnoses),
    medications: normalizeMedications(doc.medications),
    vitals: normalizeVitals(doc.vitals),
    allergies: normalizeStringArray(doc.allergies),
    riskFactors: normalizeStringArray(doc.riskFactors),
    recommendations: normalizeStringArray(doc.recommendations),
    actionItems: normalizeActionItems(doc.actionItems),
    createdAt: toIsoString(doc.createdAt),
    updatedAt: toIsoString(doc.updatedAt),
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
  actionItems: z.array(SummaryActionItemSchema).default([]),
});

export type CreatePatientSummaryInput = z.infer<
  typeof CreatePatientSummarySchema
>;

export const GetPatientSummarySchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
});

export type GetPatientSummaryInput = z.infer<typeof GetPatientSummarySchema>;

export const PatchPatientSummaryPatchSchema = z
  .object({
    sessionId: z.string().optional(),
    title: z.string().min(1).optional(),
    narrative: z.string().min(1).optional(),
    chiefComplaints: z.array(z.string()).optional(),
    diagnoses: z.array(DiagnosisSchema).optional(),
    medications: z.array(MedicationSchema).optional(),
    vitals: z.array(VitalSchema).optional(),
    allergies: z.array(z.string()).optional(),
    riskFactors: z.array(z.string()).optional(),
    recommendations: z.array(z.string()).optional(),
    actionItems: z.array(SummaryActionItemSchema).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "patch must include at least one field",
  });

export type PatchPatientSummaryPatch = z.infer<
  typeof PatchPatientSummaryPatchSchema
>;

export const PatchPatientSummarySchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  expectedVersion: z.number().int().min(1),
  patch: PatchPatientSummaryPatchSchema,
  reason: z
    .enum(["assistant_update", "doctor_edit", "system_rebuild"])
    .optional(),
});

export type PatchPatientSummaryInput = z.infer<
  typeof PatchPatientSummarySchema
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

export class PatientSummaryNotFoundError extends Error {
  constructor() {
    super("Patient summary not found");
    this.name = "PatientSummaryNotFoundError";
  }
}

export class PatientSummaryVersionConflictError extends Error {
  constructor(readonly currentVersion: number) {
    super("Patient summary version conflict");
    this.name = "PatientSummaryVersionConflictError";
  }
}
