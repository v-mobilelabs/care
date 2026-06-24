import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

/**
 * Artifact Share — document for tracking when a patient shares an artifact with a doctor.
 * Firestore path: profiles/{profileId}/artifact-shares/{shareId}
 */

// ── Firestore Document ───────────────────────────────────────────────────────

export interface ArtifactShareDocument {
  profileId: string;
  /** Type of artifact being shared: assessment, summary, prescription, lab_report */
  artifactType: "assessment" | "summary" | "prescription" | "lab_report";
  /** ID of the artifact in its respective collection */
  artifactId: string;
  /** ID of the doctor receiving the shared artifact */
  doctorId: string;
  /** Share status: pending, accepted, declined */
  shareStatus: "pending" | "accepted" | "declined";
  /** When the artifact was shared */
  createdAt: Timestamp;
  /** When the share expires (optional) */
  expiresAt?: Timestamp;
  /** Optional message from patient */
  message?: string;
}

// ── DTO (Data Transfer Object) ──────────────────────────────────────────────

export interface ArtifactShareDto {
  id: string;
  profileId: string;
  artifactType: "assessment" | "summary" | "prescription" | "lab_report";
  artifactId: string;
  doctorId: string;
  shareStatus: "pending" | "accepted" | "declined";
  createdAt: string;
  expiresAt?: string;
  message?: string;
}

// ── Mappers ──────────────────────────────────────────────────────────────────

export function toArtifactShareDto(
  id: string,
  doc: ArtifactShareDocument,
): ArtifactShareDto {
  return {
    id,
    profileId: doc.profileId,
    artifactType: doc.artifactType,
    artifactId: doc.artifactId,
    doctorId: doc.doctorId,
    shareStatus: doc.shareStatus,
    createdAt: doc.createdAt.toDate().toISOString(),
    expiresAt: doc.expiresAt?.toDate().toISOString(),
    message: doc.message,
  };
}

// ── Input/Request Schema ─────────────────────────────────────────────────────

export const CreateArtifactShareInputSchema = z.object({
  artifactType: z.enum(["assessment", "summary", "prescription", "lab_report"]),
  artifactId: z.string().min(1),
  doctorId: z.string().min(1),
  message: z.string().optional(),
});

export type CreateArtifactShareInput = z.infer<
  typeof CreateArtifactShareInputSchema
>;
