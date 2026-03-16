import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Constants ─────────────────────────────────────────────────────────────────

/** 10 MB upload limit per file */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** 100 MB total storage allocation per user */
export const USER_STORAGE_LIMIT_BYTES = 100 * 1024 * 1024;

// ── File classification labels ───────────────────────────────────────────────

export const FILE_LABELS = [
  "xray",
  "blood_test",
  "prescription",
  "scan",
  "report",
  "vaccination",
  "other",
] as const;

export type FileLabel = (typeof FILE_LABELS)[number];

export const FILE_LABEL_DISPLAY: Record<FileLabel, string> = {
  xray: "X-Ray",
  blood_test: "Blood Test",
  prescription: "Prescription",
  scan: "Scan",
  report: "Report",
  vaccination: "Vaccination",
  other: "Other",
};

export const FILE_LABEL_COLOR: Record<FileLabel, string> = {
  xray: "violet",
  blood_test: "red",
  prescription: "teal",
  scan: "indigo",
  report: "blue",
  vaccination: "green",
  other: "gray",
};

export const ALLOWED_MIME_TYPES = [
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  // Documents
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

// ── Extracted prescription data ──────────────────────────────────────────────

export interface ExtractedMedicationData {
  name: string;
  dosage?: string;
  form?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  condition?: string;
}

export interface ExtractedPrescriptionData {
  medications: ExtractedMedicationData[];
  prescribedBy?: string;
  date?: string;
  notes?: string;
}

// ── Firestore document shape ──────────────────────────────────────────────────

export interface FileDocument {
  /** Optional grouping tag — e.g. chat session UUID, "prescriptions", "blood-tests". */
  sessionId?: string;
  userId: string;
  name: string;
  mimeType: string;
  size: number;
  /** Full GCS object path, e.g. profiles/{pid}/files/{fileId}/{name} */
  storagePath: string;
  /** Signed download URL (refreshed on retrieval) */
  downloadUrl: string | null;
  /** Unix epoch ms when downloadUrl expires. Used to detect stale URLs on list. */
  urlExpiresAt?: number;
  createdAt: Timestamp;
  /** AI-extracted prescription data, populated after the user triggers extraction. */
  extractedData?: ExtractedPrescriptionData;
  /** AI-assigned classification label (background, post-upload). */
  label?: FileLabel;
  /** Confidence score 0–1 for the assigned label. */
  labelConfidence?: number;
}

// ── DTO — outbound (API responses) ───────────────────────────────────────────

export interface FileDto {
  id: string;
  sessionId?: string;
  userId: string;
  name: string;
  mimeType: string;
  size: number;
  storagePath: string;
  downloadUrl: string | null;
  createdAt: string; // ISO-8601
  extractedData?: ExtractedPrescriptionData;
  label?: FileLabel;
  labelConfidence?: number;
}

// ── DTO — inbound (upload) ────────────────────────────────────────────────────

export const UploadFileSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  profileId: z.string().min(1, { message: "profileId is required" }),
  /** Optional grouping tag — chat session UUID, "prescriptions", etc. */
  sessionId: z.string().optional(),
  name: z
    .string()
    .min(1, { message: "file name is required" })
    .max(255, { message: "file name must be 255 characters or fewer" }),
  mimeType: z.string().min(1, { message: "mimeType is required" }),
  size: z
    .number()
    .int()
    .min(1, { message: "file must not be empty" })
    .max(MAX_FILE_SIZE_BYTES, {
      message: `file size must not exceed ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB`,
    }),
  /** Raw file bytes as a Buffer */
  buffer: z.instanceof(Buffer, { message: "buffer must be a Buffer instance" }),
});

export type UploadFileInput = z.infer<typeof UploadFileSchema>;

// ── DTO — inbound (get / delete) ─────────────────────────────────────────────

export const FileRefSchema = z.object({
  fileId: z.string().min(1, { message: "fileId is required" }),
  userId: z.string().min(1, { message: "userId is required" }),
  profileId: z.string().min(1, { message: "profileId is required" }),
});

export type FileRefInput = z.infer<typeof FileRefSchema>;

export const ListFilesSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  profileId: z.string().min(1, { message: "profileId is required" }),
  /** Filter by session group — omit to list all files for the profile. */
  sessionId: z.string().optional(),
});

export type ListFilesInput = z.infer<typeof ListFilesSchema>;

// ── Storage metrics DTO ───────────────────────────────────────────────────────

export interface StorageMetricsDto {
  /** Total bytes used across all uploaded files. */
  usedBytes: number;
  /** Total number of files uploaded. */
  fileCount: number;
  /** Per-user storage allocation in bytes (100 MB). */
  limitBytes: number;
}

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toFileDto(id: string, doc: FileDocument): FileDto {
  return {
    id,
    sessionId: doc.sessionId,
    userId: doc.userId,
    name: doc.name,
    mimeType: doc.mimeType,
    size: doc.size,
    storagePath: doc.storagePath,
    downloadUrl: doc.downloadUrl,
    createdAt: doc.createdAt.toDate().toISOString(),
    extractedData: doc.extractedData,
    label: doc.label,
    labelConfidence: doc.labelConfidence,
  };
}
