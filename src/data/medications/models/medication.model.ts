import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Firestore document shape ──────────────────────────────────────────────────

export interface MedicationDocument {
  userId: string;
  /** The chat session where this medication was detected */
  sessionId?: string;
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

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toMedicationDto(
  id: string,
  doc: MedicationDocument,
): MedicationDto {
  return {
    id,
    userId: doc.userId,
    sessionId: doc.sessionId,
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

// ── DTO — inbound (delete) ────────────────────────────────────────────────────

export const DeleteMedicationSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  medicationId: z.string().min(1, { message: "medicationId is required" }),
});

export type DeleteMedicationInput = z.infer<typeof DeleteMedicationSchema>;
