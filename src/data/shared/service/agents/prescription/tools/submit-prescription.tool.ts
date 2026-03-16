import { tool } from "ai";
import { zodSchema } from "ai";
import { z } from "zod";
import { prescriptionRepository } from "@/data/prescriptions/repositories/prescription.repository";
import type { PrescriptionMedication } from "@/data/prescriptions/models/prescription.model";
import { ragIndexer } from "@/data/shared/service";

// ── Prescription schema ───────────────────────────────────────────────────────

const MedicationSchema = z.object({
  name: z.string().describe("Generic medication name"),
  dosage: z.string().describe("Dose per administration e.g. 500mg, 10mg/5ml"),
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
    .describe("Physical form of the medication"),
  frequency: z.string().describe("Dosing frequency e.g. twice daily, 8-hourly"),
  duration: z.string().describe("Treatment duration e.g. 7 days, ongoing"),
  instructions: z
    .string()
    .optional()
    .describe("Special instructions e.g. take with food, avoid alcohol"),
  indication: z.string().describe("Condition / reason for prescribing"),
  monitoring: z
    .string()
    .optional()
    .describe("Required monitoring e.g. renal function monthly"),
});

export const SubmitPrescriptionSchema = z.object({
  medications: z
    .array(MedicationSchema)
    .min(1)
    .describe("All medications included in this prescription"),
  generalInstructions: z
    .string()
    .optional()
    .describe("General advice for the patient e.g. hydration, diet, rest"),
  followUp: z
    .string()
    .optional()
    .describe("Follow-up instruction e.g. review in 2 weeks"),
  urgent: z
    .boolean()
    .optional()
    .describe(
      "Set true if this prescription requires immediate physician review before dispensing",
    ),
});

export type SubmitPrescriptionInput = z.infer<typeof SubmitPrescriptionSchema>;

// ── Tool factory ──────────────────────────────────────────────────────────────

export function createSubmitPrescriptionTool(
  userId: string,
  profileId: string,
  dependentId?: string,
) {
  return tool({
    description:
      "Submit the complete, structured prescription recommendation. Call this EXACTLY ONCE with all medications.",
    inputSchema: zodSchema(SubmitPrescriptionSchema),
    needsApproval: true,
    execute: async (rx) => {
      const prescription = rx as SubmitPrescriptionInput;

      // Persist to the prescriptions collection
      const saved = await prescriptionRepository.create(
        userId,
        {
          source: "generated",
          medications: prescription.medications as PrescriptionMedication[],
          generalInstructions: prescription.generalInstructions,
          followUp: prescription.followUp,
          urgent: prescription.urgent,
        },
        dependentId,
      );

      // Index for RAG (fire-and-forget)
      void ragIndexer
        .indexPrescription(userId, profileId, saved, dependentId)
        .catch((err) =>
          console.error("[RAG] Prescription indexing failed:", err),
        );

      return {
        status: "accepted",
        prescriptionId: saved.id,
        medicationCount: prescription.medications.length,
      } as const;
    },
  });
}
