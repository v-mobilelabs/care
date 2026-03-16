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
    .describe(
      "Prescribing doctor name if visible (legacy — prefer doctor.name)",
    ),
  date: z
    .string()
    .optional()
    .describe("Prescription date if visible (ISO format preferred)"),
  notes: z
    .string()
    .optional()
    .describe("Any general notes or instructions on the prescription"),
  doctors: z
    .array(
      z.object({
        name: z.string().optional().describe("Doctor's full name"),
        education: z.string().optional().describe("Degrees e.g. MBBS, MD"),
        specialty: z
          .string()
          .optional()
          .describe("Medical specialty e.g. Cardiologist"),
        registrationNo: z
          .string()
          .optional()
          .describe("Medical registration or license number"),
        address: z
          .object({
            street: z
              .string()
              .optional()
              .describe("Street or building name e.g. 12 MG Road"),
            area: z.string().optional().describe("Area, locality, or suburb"),
            city: z.string().optional().describe("City or district"),
            zip: z.string().optional().describe("PIN / ZIP code"),
          })
          .optional()
          .describe("Structured clinic or hospital address for this doctor"),
      }),
    )
    .optional()
    .describe(
      "All prescribing doctors visible on the prescription (usually one, sometimes more)",
    ),
  patient: z
    .object({
      name: z.string().optional().describe("Patient's full name"),
      age: z.string().optional().describe("Patient's age e.g. 32 years"),
      gender: z
        .enum(["Male", "Female", "Other"])
        .optional()
        .describe("Patient gender if visible"),
    })
    .optional()
    .describe("Patient details if visible on the prescription"),
  address: z
    .object({
      street: z
        .string()
        .optional()
        .describe("Street or building name e.g. 12 MG Road"),
      area: z.string().optional().describe("Area, locality, or suburb"),
      city: z.string().optional().describe("City or district"),
      zip: z.string().optional().describe("PIN / ZIP code"),
    })
    .optional()
    .describe(
      "General clinic or hospital address if not tied to a specific doctor",
    ),
});

// ── Input schema ──────────────────────────────────────────────────────────────

export const ExtractPrescriptionInputSchema = z.object({
  userId: z.string().min(1),
  profileId: z.string().min(1),
  fileId: z.string().min(1),
});

// ── TypeScript types ──────────────────────────────────────────────────────────

export type ExtractedMedication = z.infer<typeof ExtractedMedicationSchema>;
export type ExtractResult = z.infer<typeof ExtractionSchema>;
export type ExtractPrescriptionInput = z.infer<
  typeof ExtractPrescriptionInputSchema
>;
