/**
 * Get Patient Tool — Fetch the patient's health data from Firestore.
 *
 * Returns biological sex, height, weight, body measurements, activity level,
 * food preferences, blood group, and consent status.
 * Used when the user asks about their health metrics or body data.
 */

import { tool, zodSchema } from "ai";
import { z } from "zod";
import { patientRepository } from "@/data/patients/repositories/patient.repository";

export function createGetPatientTool(userId: string) {
  return tool({
    description:
      "Fetch the patient's health data (sex, height, weight, waist/neck/hip measurements, " +
      "activity level, food preferences, blood group). " +
      "Call this when the user asks about their body metrics, BMI, physical stats, activity level, " +
      "dietary preferences, or blood group.",
    inputSchema: zodSchema(z.object({})),
    execute: async () => {
      const patient = await patientRepository.get(userId);
      if (!patient) {
        return {
          found: false,
          message: "No patient health data found for this user.",
        };
      }
      return {
        found: true,
        dateOfBirth: patient.dateOfBirth,
        sex: patient.sex,
        height: patient.height,
        weight: patient.weight,
        waistCm: patient.waistCm,
        neckCm: patient.neckCm,
        hipCm: patient.hipCm,
        activityLevel: patient.activityLevel,
        foodPreferences: patient.foodPreferences,
        bloodGroup: patient.bloodGroup,
      };
    },
  });
}
