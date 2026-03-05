import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

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
  doctorId: string;
  doctorName: string;
  status: CallRequestStatus;
  /** AWS Chime meeting ID — set once doctor accepts */
  chimeMeetingId?: string;
  /** Stringified AWS Chime meeting response — stored for attendee creation */
  chimeMeetingData?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── DTO — outbound ───────────────────────────────────────────────────────────

export interface CallRequestDto {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  status: CallRequestStatus;
  chimeMeetingId?: string;
  /** Internal — stored Chime meeting + attendee JSON. Not exposed in list views. */
  chimeMeetingData?: string;
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

// ── Mapper ───────────────────────────────────────────────────────────────────

export function toCallRequestDto(
  id: string,
  doc: CallRequestDocument,
): CallRequestDto {
  return {
    id,
    patientId: doc.patientId,
    patientName: doc.patientName,
    doctorId: doc.doctorId,
    doctorName: doc.doctorName,
    status: doc.status,
    chimeMeetingId: doc.chimeMeetingId,
    chimeMeetingData: doc.chimeMeetingData,
    createdAt: doc.createdAt.toDate().toISOString(),
    updatedAt: doc.updatedAt.toDate().toISOString(),
  };
}
