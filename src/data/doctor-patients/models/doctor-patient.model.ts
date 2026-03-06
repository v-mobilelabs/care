import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Status ─────────────────────────────────────────────────────────────────────

export type DoctorPatientStatus = "pending" | "accepted" | "revoked";

// ── Source (how the link was created) ─────────────────────────────────────────

export type DoctorPatientSource = "search" | "call";

// ── Firestore document shape — doctor_patients/{doctorId}_{patientId} ──────────

export interface DoctorPatientDocument {
  doctorId: string;
  patientId: string;
  status: DoctorPatientStatus;
  source: DoctorPatientSource;
  /** Snapshot of the patient name at invite time, for quick display. */
  patientName?: string;
  invitedAt: Timestamp;
  acceptedAt?: Timestamp;
  revokedAt?: Timestamp;
  updatedAt: Timestamp;
}

// ── DTO — outbound ─────────────────────────────────────────────────────────────

export interface DoctorPatientDto {
  doctorId: string;
  patientId: string;
  status: DoctorPatientStatus;
  source: DoctorPatientSource;
  patientName?: string;
  /** Optional profile fields fetched when the doctor lists their patients */
  patientPhotoUrl?: string;
  patientEmail?: string;
  invitedAt: string; // ISO-8601
  acceptedAt?: string; // ISO-8601
  revokedAt?: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

/** Minimal DTO used on the patient side to see who invited them */
export interface PatientInviteDto {
  doctorId: string;
  patientId: string;
  status: DoctorPatientStatus;
  /** Snapshot of the doctor name from their profile */
  doctorName?: string;
  doctorPhotoUrl?: string;
  doctorSpecialty?: string;
  invitedAt: string;
  updatedAt: string;
}

// ── Mapper ─────────────────────────────────────────────────────────────────────

export function toDoctorPatientDto(
  doc: DoctorPatientDocument,
  extras?: { patientPhotoUrl?: string; patientEmail?: string },
): DoctorPatientDto {
  return {
    doctorId: doc.doctorId,
    patientId: doc.patientId,
    status: doc.status,
    source: doc.source,
    patientName: doc.patientName,
    patientPhotoUrl: extras?.patientPhotoUrl,
    patientEmail: extras?.patientEmail,
    invitedAt: doc.invitedAt.toDate().toISOString(),
    acceptedAt: doc.acceptedAt?.toDate().toISOString(),
    revokedAt: doc.revokedAt?.toDate().toISOString(),
    updatedAt: doc.updatedAt.toDate().toISOString(),
  };
}

// ── Zod ────────────────────────────────────────────────────────────────────────

export const InvitePatientSchema = z.object({
  patientId: z.string().min(1, "patientId is required"),
  source: z.enum(["search", "call"]).default("search"),
});

export type InvitePatientInput = z.infer<typeof InvitePatientSchema>;

export const InviteActionSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

export type InviteAction = z.infer<typeof InviteActionSchema>;
