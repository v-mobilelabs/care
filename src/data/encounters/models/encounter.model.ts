import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Encounter status ──────────────────────────────────────────────────────────

export type EncounterStatus = "active" | "completed";

// ── Firestore document — encounters/{encounterId} ─────────────────────────────

export interface EncounterDocument {
  patientId: string;
  patientName: string;
  patientPhotoUrl?: string | null;
  doctorId: string;
  doctorName: string;
  doctorPhotoUrl?: string | null;
  /** The meet-requests/{requestId} that created this encounter */
  requestId: string;
  /** AWS Chime meeting ID associated with this encounter */
  chimeMeetingId: string;
  status: EncounterStatus;
  /** Call duration in seconds — set when the encounter completes */
  durationSeconds?: number;
  /** Optional notes added by the doctor */
  notes?: string;
  startedAt: Timestamp;
  endedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── DTO — outbound ────────────────────────────────────────────────────────────

export interface EncounterDto {
  id: string;
  patientId: string;
  patientName: string;
  patientPhotoUrl?: string | null;
  doctorId: string;
  doctorName: string;
  doctorPhotoUrl?: string | null;
  requestId: string;
  chimeMeetingId: string;
  status: EncounterStatus;
  durationSeconds?: number;
  notes?: string;
  startedAt: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ── DTO — inbound (create) ────────────────────────────────────────────────────

export const CreateEncounterSchema = z.object({
  patientId: z.string().min(1, { message: "patientId is required" }),
  patientName: z.string().min(1, { message: "patientName is required" }),
  patientPhotoUrl: z.string().nullish(),
  doctorId: z.string().min(1, { message: "doctorId is required" }),
  doctorName: z.string().min(1, { message: "doctorName is required" }),
  doctorPhotoUrl: z.string().nullish(),
  requestId: z.string().min(1, { message: "requestId is required" }),
  chimeMeetingId: z.string().min(1, { message: "chimeMeetingId is required" }),
});

export type CreateEncounterInput = z.infer<typeof CreateEncounterSchema>;

// ── DTO — inbound (update notes) ─────────────────────────────────────────────

export const UpdateEncounterNotesSchema = z.object({
  notes: z
    .string()
    .max(5000, { message: "notes must be 5000 characters or fewer" }),
});

export type UpdateEncounterNotesInput = z.infer<
  typeof UpdateEncounterNotesSchema
>;

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toEncounterDto(
  id: string,
  doc: EncounterDocument,
): EncounterDto {
  return {
    id,
    patientId: doc.patientId,
    patientName: doc.patientName,
    patientPhotoUrl: doc.patientPhotoUrl ?? null,
    doctorId: doc.doctorId,
    doctorName: doc.doctorName,
    doctorPhotoUrl: doc.doctorPhotoUrl ?? null,
    requestId: doc.requestId,
    chimeMeetingId: doc.chimeMeetingId,
    status: doc.status,
    durationSeconds: doc.durationSeconds,
    notes: doc.notes,
    startedAt: doc.startedAt.toDate().toISOString(),
    endedAt: doc.endedAt?.toDate().toISOString(),
    createdAt: doc.createdAt.toDate().toISOString(),
    updatedAt: doc.updatedAt.toDate().toISOString(),
  };
}
