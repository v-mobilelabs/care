import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Biomarker ─────────────────────────────────────────────────────────────────

export type BiomarkerStatus = "normal" | "low" | "high" | "critical";

export interface Biomarker {
  name: string;
  value: string;
  unit: string;
  referenceRange?: string;
  status: BiomarkerStatus;
}

// ── Firestore document shape ──────────────────────────────────────────────────

export interface BloodTestDocument {
  userId: string;
  /** ID of the uploaded file this test was extracted from */
  fileId: string;
  /** Virtual session ID used for file storage */
  sessionId: string;
  testName: string;
  labName?: string;
  orderedBy?: string;
  testDate?: string; // ISO-8601 date
  notes?: string;
  biomarkers: Biomarker[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ── DTO — outbound ────────────────────────────────────────────────────────────

export interface BloodTestDto {
  id: string;
  userId: string;
  fileId: string;
  sessionId: string;
  testName: string;
  labName?: string;
  orderedBy?: string;
  testDate?: string;
  notes?: string;
  biomarkers: Biomarker[];
  createdAt: string; // ISO-8601
  updatedAt?: string; // ISO-8601
}

// ── Extraction result schema (used for AI structured output) ──────────────────

export const BiomarkerSchema = z.object({
  name: z
    .string()
    .describe(
      "Name of the biomarker / test parameter (e.g. Haemoglobin, LDL, Glucose)",
    ),
  value: z
    .string()
    .describe("Measured value as a string (e.g. '12.5', '5.6', '<0.01')"),
  unit: z
    .string()
    .describe("Unit of measurement (e.g. g/dL, mmol/L, mg/dL, %)"),
  referenceRange: z
    .string()
    .optional()
    .describe(
      "Normal reference range from the report (e.g. '12.0-16.0', '<200')",
    ),
  status: z
    .enum(["normal", "low", "high", "critical"])
    .describe("Flag compared against the reference range"),
});

export const BloodTestExtractionSchema = z.object({
  testName: z
    .string()
    .describe(
      "Name of the blood test panel (e.g. Complete Blood Count, Lipid Profile, HbA1c)",
    ),
  labName: z
    .string()
    .optional()
    .describe("Name of the lab / healthcare facility if visible"),
  orderedBy: z
    .string()
    .optional()
    .describe("Name of the ordering physician or doctor if visible"),
  testDate: z
    .string()
    .optional()
    .describe(
      "Date the test was performed, in ISO-8601 format (YYYY-MM-DD) if possible",
    ),
  notes: z
    .string()
    .optional()
    .describe(
      "Any general remarks, comments, or pathologist notes visible on the report",
    ),
  biomarkers: z
    .array(BiomarkerSchema)
    .min(1)
    .describe("All individual test parameters extracted from the report"),
});

export type BloodTestExtraction = z.infer<typeof BloodTestExtractionSchema>;

// ── Inbound schemas ───────────────────────────────────────────────────────────

export const ExtractBloodTestInputSchema = z.object({
  userId: z.string().min(1),
  fileId: z.string().min(1),
  /** Virtual session ID used for file storage. Defaults to the blood-tests session. */
  sessionId: z.string().min(1),
  dependentId: z.string().optional(),
});
export type ExtractBloodTestInput = z.infer<typeof ExtractBloodTestInputSchema>;

export const ListBloodTestsSchema = z.object({
  userId: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional().default(50),
});
export type ListBloodTestsInput = z.infer<typeof ListBloodTestsSchema>;

export const BloodTestRefSchema = z.object({
  userId: z.string().min(1),
  bloodTestId: z.string().min(1),
});
export type BloodTestRefInput = z.infer<typeof BloodTestRefSchema>;

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toBloodTestDto(
  id: string,
  doc: BloodTestDocument,
): BloodTestDto {
  return {
    id,
    userId: doc.userId,
    fileId: doc.fileId,
    sessionId: doc.sessionId,
    testName: doc.testName,
    labName: doc.labName,
    orderedBy: doc.orderedBy,
    testDate: doc.testDate,
    notes: doc.notes,
    biomarkers: doc.biomarkers,
    createdAt: doc.createdAt.toDate().toISOString(),
    ...(doc.updatedAt
      ? { updatedAt: doc.updatedAt.toDate().toISOString() }
      : {}),
  };
}
