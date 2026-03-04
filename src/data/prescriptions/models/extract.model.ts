import { z } from "zod";

// ── Medication schema ─────────────────────────────────────────────────────────

export const ExtractedMedicationSchema = z.object({
  name: z.string().describe("Generic or brand medication name"),
  dosage: z.string().optional().describe("Dosage amount e.g. 500mg, 10mg/5ml"),
  form: z
    .enum([
      "Tablet",
      "Capsule",
      "Oral Solution",
      "Suspension",
      "Injection",
      "Topical",
      "Patch",
      "Inhaler",
      "Eye Drops",
      "Syrup",
      "Other",
    ])
    .optional()
    .describe("Physical form of the medication"),
  frequency: z
    .string()
    .optional()
    .describe("Dosing frequency e.g. twice daily"),
  duration: z.string().optional().describe("Treatment duration e.g. 7 days"),
  instructions: z
    .string()
    .optional()
    .describe("Special instructions e.g. take with food"),
  condition: z
    .string()
    .optional()
    .describe("Indication / condition this medication is for"),
});

// ── Extraction result schema ──────────────────────────────────────────────────

export const ExtractionSchema = z.object({
  medications: z
    .array(ExtractedMedicationSchema)
    .describe("All medications listed on the prescription"),
  prescribedBy: z
    .string()
    .optional()
    .describe("Prescribing doctor name if visible"),
  date: z
    .string()
    .optional()
    .describe("Prescription date if visible (ISO format preferred)"),
  notes: z
    .string()
    .optional()
    .describe("Any general notes or instructions on the prescription"),
});

// ── Input schema ──────────────────────────────────────────────────────────────

export const ExtractPrescriptionInputSchema = z.object({
  userId: z.string().min(1),
  profileId: z.string().min(1),
  sessionId: z.string().optional(),
  fileId: z.string().min(1),
});

// ── TypeScript types ──────────────────────────────────────────────────────────

export type ExtractedMedication = z.infer<typeof ExtractedMedicationSchema>;
export type ExtractResult = z.infer<typeof ExtractionSchema>;
export type ExtractPrescriptionInput = z.infer<
  typeof ExtractPrescriptionInputSchema
>;
