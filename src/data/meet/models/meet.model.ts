import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Constants ─────────────────────────────────────────────────────────────────

export const MONTHLY_CALL_LIMIT = 1000;

// ── Call request status ──────────────────────────────────────────────────────

export type CallRequestStatus =
  | "pending" // patient waiting, doctor being notified
  | "accepted" // doctor accepted, Chime meeting created
  | "rejected" // doctor rejected
  | "ended" // call was completed
  | "cancelled" // patient cancelled before doctor responded
  | "missed"; // doctor did not respond in time

// ── Firestore document — meet-requests/{requestId} ──────────────────────────

export interface CallRequestDocument {
  patientId: string;
  patientName: string;
  patientPhotoUrl?: string | null;
  doctorId: string;
  doctorName: string;
  doctorPhotoUrl?: string | null;
  status: CallRequestStatus;
  /** AWS Chime meeting ID — set once doctor accepts */
  chimeMeetingId?: string;
  /** Stringified AWS Chime meeting response — stored for attendee creation */
  chimeMeetingData?: string;
  /** Firebase Storage URL for the call recording (WebM video) */
  recordingUrl?: string;
  /** Call duration in seconds — set when the call ends */
  durationSeconds?: number;
  /** Real-time transcript text — accumulated during the call */
  transcript?: string;
  endedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── DTO — outbound ───────────────────────────────────────────────────────────

export interface CallRequestDto {
  id: string;
  patientId: string;
  patientName: string;
  patientPhotoUrl?: string | null;
  doctorId: string;
  doctorName: string;
  doctorPhotoUrl?: string | null;
  status: CallRequestStatus;
  chimeMeetingId?: string;
  /** Internal — stored Chime meeting + attendee JSON. Not exposed in list views. */
  chimeMeetingData?: string;
  recordingUrl?: string;
  durationSeconds?: number;
  transcript?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ── DTO — inbound (create) ───────────────────────────────────────────────────

export const CreateCallRequestSchema = z.object({
  doctorId: z.string().min(1, { message: "doctorId is required" }),
});
export type CreateCallRequestInput = z.infer<typeof CreateCallRequestSchema>;

// ── DTO — inbound (accept/reject/end) ────────────────────────────────────────

export const CallRequestRefSchema = z.object({
  requestId: z.string().min(1, { message: "requestId is required" }),
});
export type CallRequestRefInput = z.infer<typeof CallRequestRefSchema>;

// ── Attendee join info (returned to clients) ─────────────────────────────────

export interface AttendeeJoinInfo {
  meeting: {
    MeetingId: string;
    MediaRegion: string;
    MediaPlacement: {
      AudioHostUrl: string;
      AudioFallbackUrl: string;
      SignalingUrl: string;
      TurnControlUrl: string;
      ScreenDataUrl: string;
      ScreenSharingUrl: string;
      ScreenViewingUrl: string;
      EventIngestionUrl: string;
    };
    ExternalMeetingId?: string;
  };
  attendee: {
    AttendeeId: string;
    ExternalUserId: string;
    JoinToken: string;
  };
  requestId: string;
}

// ── Call Metrics DTO ─────────────────────────────────────────────────────────

export interface CallMetricsDto {
  /** Number of calls initiated this calendar month. */
  used: number;
  /** Maximum calls allowed per month. */
  limit: number;
  /** ISO-8601 timestamp when the monthly counter resets (first of next month UTC). */
  resetsAt: string;
}

/** Returns ISO-8601 string for the first instant of next month (UTC). */
export function nextMonthStartUTC(): string {
  const d = new Date();
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1),
  ).toISOString();
}

// ── Mapper ───────────────────────────────────────────────────────────────────

export function toCallRequestDto(
  id: string,
  doc: CallRequestDocument,
): CallRequestDto {
  return {
    id,
    patientId: doc.patientId,
    patientName: doc.patientName,
    patientPhotoUrl: doc.patientPhotoUrl ?? null,
    doctorId: doc.doctorId,
    doctorName: doc.doctorName,
    doctorPhotoUrl: doc.doctorPhotoUrl ?? null,
    status: doc.status,
    chimeMeetingId: doc.chimeMeetingId,
    chimeMeetingData: doc.chimeMeetingData,
    recordingUrl: doc.recordingUrl,
    durationSeconds: doc.durationSeconds,
    transcript: doc.transcript,
    endedAt: doc.endedAt?.toDate().toISOString(),
    createdAt: doc.createdAt.toDate().toISOString(),
    updatedAt: doc.updatedAt.toDate().toISOString(),
  };
}
