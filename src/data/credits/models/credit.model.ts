import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Constants ─────────────────────────────────────────────────────────────────

export const DAILY_CREDITS = 10;

// ── Firestore document shape ──────────────────────────────────────────────────

export interface CreditDocument {
  /** Remaining credits for the current day. */
  remaining: number;
  /** The calendar date this record belongs to (YYYY-MM-DD, UTC). */
  date: string;
  updatedAt: Timestamp;
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface CreditDto {
  /** Remaining credits the user can spend today. */
  remaining: number;
  /** Total credits granted per day. */
  total: number;
  /** ISO-8601 timestamp at which the credits will reset (next UTC midnight). */
  resetsAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns today's date key in YYYY-MM-DD format (UTC). */
export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/** ISO-8601 string for the next UTC midnight (when credits reset). */
export function nextMidnightUTC(): string {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
}

// ── Zod schemas for use-case validation ──────────────────────────────────────

export const CreditRefSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
});

export type CreditRefInput = z.infer<typeof CreditRefSchema>;
