import type { Timestamp } from "firebase-admin/firestore";

// ── Firestore document shape ──────────────────────────────────────────────────

/**
 * Patient-specific health data stored at `patients/{userId}`.
 * Base identity fields (name, email, kind, etc.) live in `profiles/{userId}`.
 */
export interface PatientDocument {
  userId: string;
  /** ISO date "YYYY-MM-DD" */
  dateOfBirth?: string;
  /** Biological sex — used for BMR / IBW / body-fat calculations */
  sex?: "male" | "female";
  /** Height in cm */
  height?: number;
  /** Weight in kg */
  weight?: number;
  /** Waist circumference in cm — Waist-to-Height ratio, WHR, Navy body-fat */
  waistCm?: number;
  /** Neck circumference in cm — used in Navy body-fat formula */
  neckCm?: number;
  /** Hip circumference in cm — WHR and female body-fat formula */
  hipCm?: number;
  /**
   * Physical activity multiplier for TDEE = BMR × factor:
   *   sedentary 1.2 | light 1.375 | moderate 1.55 | active 1.725 | very_active 1.9
   */
  activityLevel?: "sedentary" | "light" | "moderate" | "active" | "very_active";
  /** Food/dietary preferences e.g. ["vegetarian", "gluten-free"] */
  foodPreferences?: string[];
  /** Set once when the user accepts the informed-consent terms. */
  consentedAt?: Timestamp;
  updatedAt: Timestamp;
}

// ── Input type ────────────────────────────────────────────────────────────────

export type UpsertPatientInput = Omit<
  PatientDocument,
  "updatedAt" | "consentedAt"
> & {
  /** ISO-8601 string — write-once consent timestamp */
  consentedAt?: string;
};

// ── Zod schema — used in PATCH /api/patients/me ─────────────────────────────
import { z } from "zod";

export const UpsertPatientSchema = z.object({
  dateOfBirth: z.string().optional(),
  sex: z.enum(["male", "female"]).optional(),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  waistCm: z.number().positive().optional(),
  neckCm: z.number().positive().optional(),
  hipCm: z.number().positive().optional(),
  activityLevel: z
    .enum(["sedentary", "light", "moderate", "active", "very_active"])
    .optional(),
  foodPreferences: z.array(z.string().min(1)).optional(),
  consentedAt: z.iso.datetime().optional(),
});
