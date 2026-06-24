import { z } from "zod";

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

interface FileLabelMetadata {
  display: string;
  color: string;
}

const FILE_LABEL_METADATA: Record<FileLabel, FileLabelMetadata> = {
  xray: { display: "X-Ray", color: "violet" },
  blood_test: { display: "Lab Report", color: "red" },
  prescription: { display: "Prescription", color: "teal" },
  scan: { display: "Scan", color: "indigo" },
  report: { display: "Report", color: "blue" },
  vaccination: { display: "Vaccination", color: "green" },
  other: { display: "Other", color: "gray" },
};

export const FILE_LABEL_DISPLAY: Record<FileLabel, string> = Object.fromEntries(
  Object.entries(FILE_LABEL_METADATA).map(([k, v]) => [k, v.display]),
) as Record<FileLabel, string>;

export const FILE_LABEL_COLOR: Record<FileLabel, string> = Object.fromEntries(
  Object.entries(FILE_LABEL_METADATA).map(([k, v]) => [k, v.color]),
) as Record<FileLabel, string>;

export function getLabelColor(label: FileLabel): string {
  return FILE_LABEL_METADATA[label].color;
}

export function getLabelDisplay(label: FileLabel): string {
  return FILE_LABEL_METADATA[label].display;
}

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

// ── Firestore document shape ──────────────────────────────────────────────────

export interface FileDocument {
  userId: string;
  label: FileLabel;
  sourceId?: string;
  path: string;
  mime: string;
  size: number;
  data?: unknown;
}

// ── DTO — outbound (API responses) ───────────────────────────────────────────

export interface FileDto {
  id: string;
  userId: string;
  label: FileLabel;
  sourceId?: string;
  path: string;
  mime: string;
  size: number;
  data?: unknown;
  downloadUrl: string;
  thumbnailUrl?: string;
}

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toFileDto(id: string, doc: FileDocument): FileDto {
  return {
    id,
    userId: doc.userId,
    label: doc.label,
    sourceId: doc.sourceId,
    path: doc.path,
    mime: doc.mime,
    size: doc.size,
    data: doc.data,
    downloadUrl: `/api/files/${id}`,
    thumbnailUrl: `/api/files/${id}/thumbnail`,
  };
}

// ── DTO — inbound (upload) ────────────────────────────────────────────────────

export const UploadFileSchema = z.object({
  userId: z.string().min(1),
  profileId: z.string().min(1),
  sourceId: z.string().optional(),
  name: z.string().min(1).max(255),
  mime: z.string().min(1),
  size: z.number().int().min(1).max(MAX_FILE_SIZE_BYTES),
  buffer: z.instanceof(Buffer),
});

export type UploadFileInput = z.infer<typeof UploadFileSchema>;

// ── DTO — inbound (get / delete) ─────────────────────────────────────────────

export const FileRefSchema = z.object({
  fileId: z.string().min(1),
  userId: z.string().min(1),
  profileId: z.string().min(1),
});

export type FileRefInput = z.infer<typeof FileRefSchema>;

// ── DTO — inbound (list) ──────────────────────────────────────────────────────

export const ListFilesSchema = z.object({
  userId: z.string().min(1),
  profileId: z.string().min(1),
  sourceId: z.string().optional(),
});

export type ListFilesInput = z.infer<typeof ListFilesSchema>;

// ── DTO — inbound (list all, paginated) ──────────────────────────────────────

export const ListAllFilesSchema = z.object({
  userId: z.string().min(1),
  profileId: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
  label: z.enum(FILE_LABELS).optional(),
  mime: z.string().optional(),
  q: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type ListAllFilesInput = z.infer<typeof ListAllFilesSchema>;
export type FileSortDir = "asc" | "desc";

// ── Paginated response ───────────────────────────────────────────────────────

export interface PaginatedFiles {
  files: FileDto[];
  nextCursor: string | null;
  /** Total matching documents (only computed on the first page — when no cursor). */
  totalCount?: number;
}

// ── Storage metrics DTO ───────────────────────────────────────────────────────

export interface StorageMetricsDto {
  /** Total bytes used across all uploaded files. */
  usedBytes: number;
  /** Total number of files uploaded. */
  fileCount: number;
  /** Per-user storage allocation in bytes (100 MB). */
  limitBytes: number;
}
