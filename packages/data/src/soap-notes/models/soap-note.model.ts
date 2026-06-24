import type { Timestamp } from "firebase-admin/firestore";

// ── Firestore document shape ──────────────────────────────────────────────────

export interface SoapNoteDocument {
  userId: string;
  sessionId?: string;
  condition: string;
  riskLevel: "low" | "moderate" | "high" | "emergency";
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ── DTO — outbound ────────────────────────────────────────────────────────────

export interface SoapNoteDto {
  id: string;
  userId: string;
  sessionId?: string;
  condition: string;
  riskLevel: "low" | "moderate" | "high" | "emergency";
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string[];
  createdAt: string; // ISO-8601
  updatedAt?: string; // ISO-8601
}

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
    updatedAt: doc.updatedAt?.toDate().toISOString(),
  };
}
