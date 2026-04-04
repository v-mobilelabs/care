/**
 * Get Patient Profile Tool — Fetch the patient's merged profile + health snapshot.
 *
 * Returns base identity/profile facts plus patient health data so agents
 * can retrieve personal and health information in a single tool call.
 */

import { tool, zodSchema } from "ai";
import { z } from "zod";
import { patientRepository } from "@/data/patients/repositories/patient.repository";
import { profileRepository } from "@/data/profile/repositories/profile.repository";

function computeAge(dateOfBirth?: string): number | undefined {
  if (!dateOfBirth) return undefined;

  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return undefined;

  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? age : undefined;
}

export function createGetPatientProfileTool(userId: string) {
  return tool({
    description:
      "Fetch the patient's merged personal and health snapshot, including age/date of birth from profile, " +
      "name, gender, location, sex, height, weight, waist/neck/hip measurements, activity level, " +
      "dietary preferences, and blood group. " +
      "Call this when the user asks about their age, date of birth, basic profile facts, body metrics, " +
      "physical stats, activity level, dietary preferences, or blood group.",
    inputSchema: zodSchema(z.object({})),
    execute: async () => {
      const [patient, profile] = await Promise.all([
        patientRepository.get(userId),
        profileRepository.get(userId),
      ]);

      if (!patient && !profile) {
        return {
          found: false,
          message: "No patient profile or health data found for this user.",
        };
      }

      const dateOfBirth = profile?.dateOfBirth;
      const age = computeAge(dateOfBirth);

      return {
        found: true,
        hasProfile: Boolean(profile),
        hasHealthRecord: Boolean(patient),
        name: profile?.name,
        gender: profile?.gender,
        city: profile?.city,
        country: profile?.country,
        dateOfBirth,
        age,
        sex: patient?.sex,
        height: patient?.height,
        weight: patient?.weight,
        waistCm: patient?.waistCm,
        neckCm: patient?.neckCm,
        hipCm: patient?.hipCm,
        activityLevel: patient?.activityLevel,
        foodPreferences: patient?.foodPreferences,
        bloodGroup: patient?.bloodGroup,
      };
    },
  });
}
