import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Firestore document shape ──────────────────────────────────────────────────

export interface MedicationDocument {
  userId: string;
  /** The chat session where this medication was detected */
  sessionId?: string;
  /** The prescription that sourced this medication */
  prescriptionId?: string;
  name: string;
  dosage?: string;
  form?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  /** The condition this medication treats */
  condition?: string;
  status: "active" | "completed" | "discontinued" | "paused";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── DTO — outbound ────────────────────────────────────────────────────────────

export interface MedicationDto {
  id: string;
  userId: string;
  sessionId?: string;
  prescriptionId?: string;
  name: string;
  dosage?: string;
  form?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  condition?: string;
  status: "active" | "completed" | "discontinued" | "paused";
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

export type MedicationStatus =
  | "active"
  | "completed"
  | "discontinued"
  | "paused";

export type MedicationSortDir = "asc" | "desc";

export interface PaginatedMedications {
  medications: MedicationDto[];
  nextCursor: string | null;
  /** Total matching documents (only computed on first page and without text search). */
  totalCount?: number;
}

export interface MedicationMatchDto {
  id: string;
  name: string;
  brandName?: string;
  genericName?: string;
  dosage?: string;
  form?: string;
  route?: string;
  drugType?: string;
  composition?: string[];
  display: string;
  source: "knowledge_base" | "web";
  sourceUrl?: string;
  confidence: "high" | "medium" | "low";
}

export interface MedicationMatchResult {
  query: string;
  resolvedFrom: "knowledge_base" | "web" | "none";
  matches: MedicationMatchDto[];
}

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toMedicationDto(
  id: string,
  doc: MedicationDocument,
): MedicationDto {
  return {
    id,
    userId: doc.userId,
    sessionId: doc.sessionId,
    prescriptionId: doc.prescriptionId,
    name: doc.name,
    dosage: doc.dosage,
    form: doc.form,
    frequency: doc.frequency,
    duration: doc.duration,
    instructions: doc.instructions,
    condition: doc.condition,
    status: doc.status,
    createdAt: doc.createdAt.toDate().toISOString(),
    updatedAt: doc.updatedAt.toDate().toISOString(),
  };
}

// ── DTO — inbound (create) ────────────────────────────────────────────────────

export const CreateMedicationSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  /** Required for RAG indexing — the user's own profile ID */
  profileId: z.string().optional(),
  sessionId: z.string().optional(),
  prescriptionId: z.string().optional(),
  name: z.string().min(1),
  dosage: z.string().optional(),
  form: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  instructions: z.string().optional(),
  condition: z.string().optional(),
  status: z
    .enum(["active", "completed", "discontinued", "paused"])
    .default("active"),
});

export type CreateMedicationInput = z.infer<typeof CreateMedicationSchema>;

// ── DTO — inbound (update) ────────────────────────────────────────────────────

export const UpdateMedicationSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  medicationId: z.string().min(1, { message: "medicationId is required" }),
  name: z.string().min(1).optional(),
  dosage: z.string().optional(),
  form: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  instructions: z.string().optional(),
  condition: z.string().optional(),
  status: z.enum(["active", "completed", "discontinued", "paused"]).optional(),
});

export type UpdateMedicationInput = z.infer<typeof UpdateMedicationSchema>;

// ── DTO — inbound (list) ──────────────────────────────────────────────────────

export const ListMedicationsSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  limit: z.number().int().min(1).max(200).optional().default(100),
});

export type ListMedicationsInput = z.infer<typeof ListMedicationsSchema>;

export const ListMedicationsPaginatedSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  limit: z.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
  status: z.enum(["active", "completed", "discontinued", "paused"]).optional(),
  q: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type ListMedicationsPaginatedInput = z.infer<
  typeof ListMedicationsPaginatedSchema
>;

export const SearchMedicationMatchesSchema = z.object({
  query: z
    .string()
    .min(2, { message: "query must contain at least 2 characters" }),
  limit: z.number().int().min(1).max(20).optional().default(8),
});

export type SearchMedicationMatchesInput = z.infer<
  typeof SearchMedicationMatchesSchema
>;

// ── DTO — inbound (delete) ────────────────────────────────────────────────────

export const DeleteMedicationSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  medicationId: z.string().min(1, { message: "medicationId is required" }),
});

export type DeleteMedicationInput = z.infer<typeof DeleteMedicationSchema>;
