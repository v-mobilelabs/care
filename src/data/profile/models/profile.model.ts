import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Firestore document shape ──────────────────────────────────────────────────

export interface ProfileDocument {
  userId: string;
  dateOfBirth?: string; // ISO date "YYYY-MM-DD"
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
  country?: string;
  city?: string;
  /** Food/dietary preferences e.g. ["vegetarian", "gluten-free"] */
  foodPreferences?: string[];
  /** Set once when the user accepts the informed-consent terms. */
  consentedAt?: Timestamp;
  updatedAt: Timestamp;
}

// ── DTO — outbound ────────────────────────────────────────────────────────────

export interface ProfileDto {
  userId: string;
  dateOfBirth?: string;
  sex?: "male" | "female";
  height?: number;
  weight?: number;
  waistCm?: number;
  neckCm?: number;
  hipCm?: number;
  activityLevel?: "sedentary" | "light" | "moderate" | "active" | "very_active";
  country?: string;
  city?: string;
  /** Food/dietary preferences e.g. ["vegetarian", "gluten-free"] */
  foodPreferences?: string[];
  /** ISO-8601 timestamp of when the user accepted the consent terms. */
  consentedAt?: string;
  updatedAt: string; // ISO-8601
}

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toProfileDto(doc: ProfileDocument): ProfileDto {
  return {
    userId: doc.userId,
    dateOfBirth: doc.dateOfBirth,
    sex: doc.sex,
    height: doc.height,
    weight: doc.weight,
    waistCm: doc.waistCm,
    neckCm: doc.neckCm,
    hipCm: doc.hipCm,
    activityLevel: doc.activityLevel,
    country: doc.country,
    city: doc.city,
    foodPreferences: doc.foodPreferences,
    consentedAt: doc.consentedAt?.toDate().toISOString(),
    updatedAt: doc.updatedAt.toDate().toISOString(),
  };
}

// ── Schema — inbound (upsert) ─────────────────────────────────────────────────

export const UpsertProfileSchema = z.object({
  userId: z.string().min(1),
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
  country: z.string().optional(),
  city: z.string().optional(),
  /** Food/dietary preferences e.g. ["vegetarian", "gluten-free"] */
  foodPreferences: z.array(z.string().min(1)).optional(),
  /** ISO-8601 string — set once when the user accepts the consent terms. */
  consentedAt: z.iso.datetime().optional(),
});

export type UpsertProfileInput = z.infer<typeof UpsertProfileSchema>;

export const GetProfileSchema = z.object({
  userId: z.string().min(1),
});

export type GetProfileInput = z.infer<typeof GetProfileSchema>;
