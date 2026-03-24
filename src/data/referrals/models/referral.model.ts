import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Status ────────────────────────────────────────────────────────────────────

export type ReferralStatus = "pending" | "accepted" | "dismissed" | "completed";

// ── Firestore document shape ──────────────────────────────────────────────────

export interface ReferralDocument {
  userId: string;
  /** Session that surfaced the referral card */
  sessionId: string;
  /** Target specialist (e.g. "cardiology", "dentistry") */
  specialist: string;
  /** Clinical reason for the referral */
  reason: string;
  /** Optional label of the triggering report */
  reportLabel?: string;
  status: ReferralStatus;
  acceptedAt?: Timestamp;
  dismissedAt?: Timestamp;
  completedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ── DTO — outbound ────────────────────────────────────────────────────────────

export interface ReferralDto {
  id: string;
  userId: string;
  sessionId: string;
  specialist: string;
  reason: string;
  reportLabel?: string;
  status: ReferralStatus;
  acceptedAt?: string;
  dismissedAt?: string;
  completedAt?: string;
  createdAt: string; // ISO-8601
  updatedAt?: string; // ISO-8601
}

// ── Mapper ────────────────────────────────────────────────────────────────────

function toIso(ts?: Timestamp): string | undefined {
  return ts ? ts.toDate().toISOString() : undefined;
}

export function toReferralDto(id: string, doc: ReferralDocument): ReferralDto {
  return {
    id,
    userId: doc.userId,
    sessionId: doc.sessionId,
    specialist: doc.specialist,
    reason: doc.reason,
    ...(doc.reportLabel !== undefined ? { reportLabel: doc.reportLabel } : {}),
    status: doc.status,
    ...(doc.acceptedAt ? { acceptedAt: toIso(doc.acceptedAt) } : {}),
    ...(doc.dismissedAt ? { dismissedAt: toIso(doc.dismissedAt) } : {}),
    ...(doc.completedAt ? { completedAt: toIso(doc.completedAt) } : {}),
    createdAt: doc.createdAt.toDate().toISOString(),
    ...(doc.updatedAt ? { updatedAt: toIso(doc.updatedAt) } : {}),
  };
}

// ── Zod schemas ───────────────────────────────────────────────────────────────

export const CreateReferralSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  sessionId: z.string().min(1, { message: "sessionId is required" }),
  specialist: z.string().min(1, { message: "specialist is required" }),
  reason: z.string().min(1, { message: "reason is required" }),
  reportLabel: z.string().optional(),
});

export type CreateReferralInput = z.infer<typeof CreateReferralSchema>;

export const ListReferralsSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  limit: z.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
  status: z.enum(["pending", "accepted", "dismissed", "completed"]).optional(),
  specialist: z.string().optional(),
});

export type ListReferralsInput = z.infer<typeof ListReferralsSchema>;

export interface PaginatedReferrals {
  referrals: ReferralDto[];
  nextCursor: string | null;
  totalCount?: number;
}

export const UpdateReferralStatusSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  referralId: z.string().min(1, { message: "referralId is required" }),
  status: z.enum(["pending", "accepted", "dismissed", "completed"]),
});

export type UpdateReferralStatusInput = z.infer<
  typeof UpdateReferralStatusSchema
>;
