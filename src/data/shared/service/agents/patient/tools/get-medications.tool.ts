/**
 * Get Medications Tool — Fetch the patient's medication records from Firestore.
 *
 * Returns all medications with name, dosage, form, frequency, duration,
 * instructions, condition, and status.
 * Used when the user asks about their medications, drugs, or prescriptions.
 */

import { tool, zodSchema } from "ai";
import { z } from "zod";
import { medicationRepository } from "@/data/medications/repositories/medication.repository";

export function createGetMedicationsTool(userId: string, dependentId?: string) {
  return tool({
    description:
      "Fetch the patient's medication records (name, dosage, form, frequency, duration, " +
      "instructions, condition, status). " +
      "Call this when the user asks about their medications, drugs, meds, prescriptions, " +
      "what they are taking, or drug interactions.",
    inputSchema: zodSchema(z.object({})),
    execute: async () => {
      const medications = await medicationRepository.list(
        userId,
        100,
        dependentId,
      );
      if (medications.length === 0) {
        return {
          found: false,
          count: 0,
          message: "No medications found for this patient.",
        };
      }
      return {
        found: true,
        count: medications.length,
        medications: medications.map((med) => ({
          id: med.id,
          name: med.name,
          dosage: med.dosage,
          form: med.form,
          frequency: med.frequency,
          duration: med.duration,
          instructions: med.instructions,
          condition: med.condition,
          status: med.status,
        })),
      };
    },
  });
}
