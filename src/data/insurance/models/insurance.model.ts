import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Firestore document shape ──────────────────────────────────────────────────

export interface InsuranceDocument {
  userId: string;
  /** Insurance provider / company name */
  providerName: string;
  /** Policy number */
  policyNumber: string;
  /** Group number (employer plans) */
  groupNumber?: string;
  /** Plan name (e.g. "Gold PPO 1000") */
  planName?: string;
  /** Broad insurance category */
  type: "health" | "dental" | "vision" | "life" | "disability" | "other";
  /** Name of the primary subscriber */
  subscriberName?: string;
  /** Member / beneficiary ID */
  memberId?: string;
  /** ISO date YYYY-MM-DD */
  effectiveDate?: string;
  /** ISO date YYYY-MM-DD */
  expirationDate?: string;
  /** Copay amount in dollars */
  copay?: number;
  /** Annual deductible in dollars */
  deductible?: number;
  /** Annual out-of-pocket maximum in dollars */
  outOfPocketMax?: number;
  /** Free-form notes */
  notes?: string;
  /** GCS storage path for the uploaded insurance card / document */
  documentStoragePath?: string;
  /** Signed download URL — refreshed on read */
  documentUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── DTO — outbound ────────────────────────────────────────────────────────────

export interface InsuranceDto {
  id: string;
  userId: string;
  providerName: string;
  policyNumber: string;
  groupNumber?: string;
  planName?: string;
  type: "health" | "dental" | "vision" | "life" | "disability" | "other";
  subscriberName?: string;
  memberId?: string;
  effectiveDate?: string;
  expirationDate?: string;
  copay?: number;
  deductible?: number;
  outOfPocketMax?: number;
  notes?: string;
  documentStoragePath?: string;
  documentUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toInsuranceDto(
  id: string,
  doc: InsuranceDocument,
): InsuranceDto {
  return {
    id,
    userId: doc.userId,
    providerName: doc.providerName,
    policyNumber: doc.policyNumber,
    groupNumber: doc.groupNumber,
    planName: doc.planName,
    type: doc.type,
    subscriberName: doc.subscriberName,
    memberId: doc.memberId,
    effectiveDate: doc.effectiveDate,
    expirationDate: doc.expirationDate,
    copay: doc.copay,
    deductible: doc.deductible,
    outOfPocketMax: doc.outOfPocketMax,
    notes: doc.notes,
    documentStoragePath: doc.documentStoragePath,
    // Stable proxy URL — never expires. The proxy generates a fresh signed URL on each request.
    documentUrl: doc.documentStoragePath ? `/api/files/${id}` : undefined,
    createdAt: doc.createdAt.toDate().toISOString(),
    updatedAt: doc.updatedAt.toDate().toISOString(),
  };
}

// ── Schemas — inbound ─────────────────────────────────────────────────────────

const InsuranceTypeEnum = z.enum([
  "health",
  "dental",
  "vision",
  "life",
  "disability",
  "other",
]);

export const CreateInsuranceSchema = z.object({
  userId: z.string().min(1),
  providerName: z.string().min(1),
  policyNumber: z.string().min(1),
  groupNumber: z.string().optional(),
  planName: z.string().optional(),
  type: InsuranceTypeEnum.default("health"),
  subscriberName: z.string().optional(),
  memberId: z.string().optional(),
  effectiveDate: z.string().optional(),
  expirationDate: z.string().optional(),
  copay: z.number().nonnegative().optional(),
  deductible: z.number().nonnegative().optional(),
  outOfPocketMax: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  /** Pre-uploaded draft file path — linked on creation, no separate upload step needed */
  documentStoragePath: z.string().optional(),
  documentUrl: z.string().optional(),
});

export type CreateInsuranceInput = z.infer<typeof CreateInsuranceSchema>;

export const UpdateInsuranceSchema = z.object({
  userId: z.string().min(1),
  insuranceId: z.string().min(1),
  providerName: z.string().min(1).optional(),
  policyNumber: z.string().min(1).optional(),
  groupNumber: z.string().optional(),
  planName: z.string().optional(),
  type: InsuranceTypeEnum.optional(),
  subscriberName: z.string().optional(),
  memberId: z.string().optional(),
  effectiveDate: z.string().optional(),
  expirationDate: z.string().optional(),
  copay: z.number().nonnegative().optional(),
  deductible: z.number().nonnegative().optional(),
  outOfPocketMax: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export type UpdateInsuranceInput = z.infer<typeof UpdateInsuranceSchema>;

export const DeleteInsuranceSchema = z.object({
  userId: z.string().min(1),
  insuranceId: z.string().min(1),
});

export type DeleteInsuranceInput = z.infer<typeof DeleteInsuranceSchema>;

export const ListInsuranceSchema = z.object({
  userId: z.string().min(1),
  limit: z.number().int().positive().default(50),
});

export type ListInsuranceInput = z.infer<typeof ListInsuranceSchema>;
