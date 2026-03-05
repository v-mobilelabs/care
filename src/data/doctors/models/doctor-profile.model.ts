import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Availability status ───────────────────────────────────────────────────────

export type AvailabilityStatus = "available" | "unavailable";

// ── Firestore document shape — doctors/{uid} ──────────────────────────────────
// Base identity fields (name, email, phone, kind) live in profiles/{uid}.

export interface DoctorProfileDocument {
  uid: string;
  specialty: string;
  licenseNumber: string;
  bio?: string;
  availability: AvailabilityStatus;
  checkedInAt?: Timestamp;
  checkedOutAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── DTO — outbound (combined view: doctors/{uid} + profiles/{uid}) ────────────

export interface DoctorProfileDto {
  uid: string;
  // All fields from doctors/{uid} — identity fields live in ProfileDto (profiles/{uid})
  specialty: string;
  licenseNumber: string;
  bio?: string;
  availability: AvailabilityStatus;
  checkedInAt?: string; // ISO-8601
  checkedOutAt?: string; // ISO-8601
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toDoctorProfileDto(
  doc: DoctorProfileDocument,
): DoctorProfileDto {
  return {
    uid: doc.uid,
    specialty: doc.specialty,
    licenseNumber: doc.licenseNumber,
    bio: doc.bio,
    availability: doc.availability,
    checkedInAt: doc.checkedInAt?.toDate().toISOString(),
    checkedOutAt: doc.checkedOutAt?.toDate().toISOString(),
    createdAt: doc.createdAt.toDate().toISOString(),
    updatedAt: doc.updatedAt.toDate().toISOString(),
  };
}

// ── Zod schemas ───────────────────────────────────────────────────────────────

export const RegisterDoctorSchema = z.object({
  uid: z.string().min(1, { message: "uid is required" }),
  specialty: z.string().min(2, { message: "Specialty is required" }),
  licenseNumber: z.string().min(2, { message: "License number is required" }),
  bio: z.string().optional(),
});

export type RegisterDoctorInput = z.infer<typeof RegisterDoctorSchema>;

/** Schema for PUT /api/doctors/me — update professional fields only.
 * Identity fields (name, phone, photoUrl) are updated via PUT /api/profile.
 */
export const UpdateDoctorSchema = z.object({
  specialty: z.string().min(2).optional(),
  licenseNumber: z.string().min(2).optional(),
  bio: z.string().optional(),
});

export type UpdateDoctorInput = z.infer<typeof UpdateDoctorSchema>;

export const UpdateAvailabilitySchema = z.object({
  uid: z.string().min(1, { message: "uid is required" }),
  availability: z.enum(["available", "unavailable"]),
});

export type UpdateAvailabilityInput = z.infer<typeof UpdateAvailabilitySchema>;

export const GetDoctorProfileSchema = z.object({
  uid: z.string().min(1, { message: "uid is required" }),
});

export type GetDoctorProfileInput = z.infer<typeof GetDoctorProfileSchema>;
