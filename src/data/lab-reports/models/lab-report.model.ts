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

export interface LabReportDocument {
  userId: string;
  /** ID of the uploaded file this test was extracted from */
  fileId: string;
  /** Signed download URL for the source file */
  fileUrl?: string;
  /** MIME type of the source file (e.g. image/jpeg, application/pdf) */
  fileMimeType?: string;
  /** Chat session linked to this report for follow-up questions */
  sessionId?: string;
  testName: string;
  labName?: string;
  labAddress?: string;
  orderedBy?: string;
  testDate?: string; // ISO-8601 date
  notes?: string;
  biomarkers: Biomarker[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ── DTO — outbound ────────────────────────────────────────────────────────────

export interface LabReportDto {
  id: string;
  userId: string;
  fileId: string;
  fileUrl?: string;
  fileMimeType?: string;
  sessionId?: string;
  testName: string;
  labName?: string;
  labAddress?: string;
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

export const LabReportExtractionSchema = z.object({
  testName: z
    .string()
    .describe(
      "Name of the blood test panel (e.g. Complete Blood Count, Lipid Profile, HbA1c)",
    ),
  labName: z
    .string()
    .optional()
    .describe("Name of the lab / healthcare facility if visible"),
  labAddress: z
    .string()
    .optional()
    .describe("Address or location of the laboratory if visible on the report"),
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

export type LabReportExtraction = z.infer<typeof LabReportExtractionSchema>;

// ── Inbound schemas ───────────────────────────────────────────────────────────

export const ExtractLabReportInputSchema = z.object({
  userId: z.string().min(1),
  profileId: z.string().min(1),
  fileId: z.string().min(1),
  /** Optional: scopes lab report records to a dependent sub-collection. */
  dependentId: z.string().optional(),
});
export type ExtractLabReportInput = z.infer<typeof ExtractLabReportInputSchema>;

export const ListLabReportsSchema = z.object({
  userId: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional().default(50),
});
export type ListLabReportsInput = z.infer<typeof ListLabReportsSchema>;

export const LabReportRefSchema = z.object({
  userId: z.string().min(1),
  labReportId: z.string().min(1),
});
export type LabReportRefInput = z.infer<typeof LabReportRefSchema>;

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toLabReportDto(
  id: string,
  doc: LabReportDocument,
): LabReportDto {
  return {
    id,
    userId: doc.userId,
    fileId: doc.fileId,
    fileUrl: doc.fileUrl,
    fileMimeType: doc.fileMimeType,
    sessionId: doc.sessionId,
    testName: doc.testName,
    labName: doc.labName,
    labAddress: doc.labAddress,
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
