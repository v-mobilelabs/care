import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Medication ────────────────────────────────────────────────────────────────

export type MedicationForm =
  | "Tablet"
  | "Capsule"
  | "Oral Solution"
  | "Suspension"
  | "Injection"
  | "Topical"
  | "Patch"
  | "Inhaler"
  | "Eye Drops"
  | "Syrup"
  | "Other";

export interface PrescriptionMedication {
  name: string;
  dosage: string;
  form: MedicationForm;
  frequency: string;
  duration: string;
  instructions?: string;
  indication: string;
  monitoring?: string;
}

// ── Firestore document shape ──────────────────────────────────────────────────

export interface PrescriptionDocument {
  userId: string;
  /** Source file ID if extracted from an uploaded prescription image/PDF */
  fileId?: string;
  /** Signed download URL for the source file */
  fileUrl?: string;
  /** "extracted" when from file upload, "generated" when AI-recommended */
  source: "extracted" | "generated";
  medications: PrescriptionMedication[];
  generalInstructions?: string;
  followUp?: string;
  urgent?: boolean;
  prescribedBy?: string;
  prescriptionDate?: string; // ISO-8601 date
  notes?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ── DTO — outbound ────────────────────────────────────────────────────────────

export interface PrescriptionDto {
  id: string;
  userId: string;
  fileId?: string;
  fileUrl?: string;
  source: "extracted" | "generated";
  medications: PrescriptionMedication[];
  generalInstructions?: string;
  followUp?: string;
  urgent?: boolean;
  prescribedBy?: string;
  prescriptionDate?: string;
  notes?: string;
  createdAt: string; // ISO-8601
  updatedAt?: string; // ISO-8601
}

// ── Inbound schemas ───────────────────────────────────────────────────────────

export const CreatePrescriptionSchema = z.object({
  userId: z.string().min(1),
  profileId: z.string().min(1),
  fileId: z.string().optional(),
  fileUrl: z.string().optional(),
  source: z.enum(["extracted", "generated"]),
  medications: z
    .array(
      z.object({
        name: z.string(),
        dosage: z.string(),
        form: z.enum([
          "Tablet",
          "Capsule",
          "Oral Solution",
          "Suspension",
          "Injection",
          "Topical",
          "Patch",
          "Inhaler",
          "Eye Drops",
          "Syrup",
          "Other",
        ]),
        frequency: z.string(),
        duration: z.string(),
        instructions: z.string().optional(),
        indication: z.string(),
        monitoring: z.string().optional(),
      }),
    )
    .min(1),
  generalInstructions: z.string().optional(),
  followUp: z.string().optional(),
  urgent: z.boolean().optional(),
  prescribedBy: z.string().optional(),
  prescriptionDate: z.string().optional(),
  notes: z.string().optional(),
  dependentId: z.string().optional(),
});
export type CreatePrescriptionInput = z.infer<typeof CreatePrescriptionSchema>;

export const ListPrescriptionsSchema = z.object({
  userId: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional().default(50),
});
export type ListPrescriptionsInput = z.infer<typeof ListPrescriptionsSchema>;

export const PrescriptionRefSchema = z.object({
  userId: z.string().min(1),
  prescriptionId: z.string().min(1),
});
export type PrescriptionRefInput = z.infer<typeof PrescriptionRefSchema>;

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toPrescriptionDto(
  id: string,
  doc: PrescriptionDocument,
): PrescriptionDto {
  return {
    id,
    userId: doc.userId,
    fileId: doc.fileId,
    fileUrl: doc.fileUrl,
    source: doc.source,
    medications: doc.medications,
    generalInstructions: doc.generalInstructions,
    followUp: doc.followUp,
    urgent: doc.urgent,
    prescribedBy: doc.prescribedBy,
    prescriptionDate: doc.prescriptionDate,
    notes: doc.notes,
    createdAt: doc.createdAt.toDate().toISOString(),
    ...(doc.updatedAt
      ? { updatedAt: doc.updatedAt.toDate().toISOString() }
      : {}),
  };
}
