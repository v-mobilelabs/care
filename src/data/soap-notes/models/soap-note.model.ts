import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Firestore document shape ──────────────────────────────────────────────────

export interface SoapNoteDocument {
  userId: string;
  /** The chat session that generated this note */
  sessionId: string;
  condition: string;
  riskLevel: "low" | "moderate" | "high" | "emergency";
  subjective: string;
  objective: string;
  assessment: string;
  plan: string[];
  createdAt: Timestamp;
  /** Set on every update after the initial creation. */
  updatedAt?: Timestamp;
}

// ── DTO — outbound ────────────────────────────────────────────────────────────

export interface SoapNoteDto {
  id: string;
  userId: string;
  sessionId: string;
  condition: string;
  riskLevel: "low" | "moderate" | "high" | "emergency";
  subjective: string;
  objective: string;
  assessment: string;
  plan: string[];
  createdAt: string; // ISO-8601
  updatedAt?: string; // ISO-8601 — present if the note has been updated
}

// ── DTO — inbound (create) ────────────────────────────────────────────────────

export const CreateSoapNoteSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  sessionId: z.string().min(1, { message: "sessionId is required" }),
  condition: z.string().min(1),
  riskLevel: z.enum(["low", "moderate", "high", "emergency"]),
  subjective: z.string().min(1),
  objective: z.string().min(1),
  assessment: z.string().min(1),
  plan: z.array(z.string()).min(1),
});

export type CreateSoapNoteInput = z.infer<typeof CreateSoapNoteSchema>;

// ── DTO — inbound (list) ──────────────────────────────────────────────────────

export const ListSoapNotesSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  limit: z.number().int().min(1).max(100).optional().default(50),
});

export type ListSoapNotesInput = z.infer<typeof ListSoapNotesSchema>;

// ── DTO — inbound (get single) ────────────────────────────────────────────────

export const SoapNoteRefSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  noteId: z.string().min(1, { message: "noteId is required" }),
});

export type SoapNoteRefInput = z.infer<typeof SoapNoteRefSchema>;

// ── DTO — inbound (delete) ────────────────────────────────────────────────────
// Reuses SoapNoteRefSchema — same shape as get-by-id.
export const DeleteSoapNoteSchema = SoapNoteRefSchema;

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toSoapNoteDto(id: string, doc: SoapNoteDocument): SoapNoteDto {
  return {
    id,
    userId: doc.userId,
    sessionId: doc.sessionId,
    condition: doc.condition,
    riskLevel: doc.riskLevel,
    subjective: doc.subjective,
    objective: doc.objective,
    assessment: doc.assessment,
    plan: doc.plan,
    createdAt: doc.createdAt.toDate().toISOString(),
    ...(doc.updatedAt
      ? { updatedAt: doc.updatedAt.toDate().toISOString() }
      : {}),
  };
}
