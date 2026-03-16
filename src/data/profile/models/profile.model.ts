import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";
import { USER_KINDS, type UserKind } from "@/lib/auth/jwt";

export interface ProfileDocument {
  userId: string;
  /** Discriminates user kind across all collections. */
  kind: UserKind;
  name?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  /** Self-identified gender e.g. "man", "woman", "non-binary", "prefer-not-to-say" */
  gender?: string;
  city?: string;
  country?: string;
  dateOfBirth?: string; // ISO-8601 date string (YYYY-MM-DD)
  updatedAt: Timestamp;
}

// ── DTO — outbound (base identity only) ──────────────────────────────────────

export interface ProfileDto {
  userId: string;
  kind: UserKind;
  name?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  dateOfBirth?: string;
  country?: string;
  city?: string;
  gender?: string;
  updatedAt: string; // ISO-8601
}

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toProfileDto(base: ProfileDocument): ProfileDto {
  // Back-compat: documents may carry the legacy kind:"patient" value written
  // during a brief migration window — normalise to the canonical "user".
  const rawKind = base.kind as string;
  const kind: UserKind = rawKind === "doctor" ? "doctor" : "user";

  return {
    userId: base.userId,
    kind,
    name: base.name,
    email: base.email,
    phone: base.phone,
    photoUrl: base.photoUrl,
    city: base.city,
    country: base.country,
    dateOfBirth: base.dateOfBirth,
    gender: base.gender,
    updatedAt: base.updatedAt.toDate().toISOString(),
  };
}

// ── Schema — inbound (upsert) ─────────────────────────────────────────────────

export const UpsertProfileSchema = z.object({
  userId: z.string().min(1),
  // Base identity only — patient health fields go to PUT /api/patients/me,
  // doctor professional fields go to PUT /api/doctors/me.
  kind: z.enum(USER_KINDS).optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  photoUrl: z.string().min(1).optional(),
  gender: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  /** ISO-8601 date string (YYYY-MM-DD) */
  dateOfBirth: z.string().optional(),
});

export type UpsertProfileInput = z.infer<typeof UpsertProfileSchema>;

export const GetProfileSchema = z.object({
  userId: z.string().min(1),
});

export type GetProfileInput = z.infer<typeof GetProfileSchema>;
