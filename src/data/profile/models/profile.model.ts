import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Firestore document shape ──────────────────────────────────────────────────

export interface ProfileDocument {
  userId: string;
  dateOfBirth?: string; // ISO date "YYYY-MM-DD"
  /** Height in cm */
  height?: number;
  /** Weight in kg */
  weight?: number;
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
  height?: number;
  weight?: number;
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
    height: doc.height,
    weight: doc.weight,
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
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
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
