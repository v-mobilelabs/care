/**
 * Encounter Model — Clinical workflow outcomes and KPI measurements
 *
 * Tracks the outcome of each agent-managed workflow: deflection, escalation, resolution.
 * Used to compute KPIs like deflection rate, time-to-resolution, quality scores.
 */

import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Outcome Types ─────────────────────────────────────────────────────────

export type EncounterOutcome =
  | "deflected"
  | "escalated"
  | "resolved"
  | "abandoned";
export type DeflectionReason =
  | "self-care"
  | "reassurance"
  | "scheduling"
  | "ehr_guidance"
  | "other";
export type RiskLevel = "low" | "moderate" | "high" | "emergency";

// ── Documents ─────────────────────────────────────────────────────────────

export interface EncounterDocument {
  userId: string;
  profileId: string;
  agentType: string;
  sessionId: string;
  messageId?: string;
  // Outcome classification
  outcome: EncounterOutcome;
  deflectionReason?: DeflectionReason;
  escalationReason?: string;
  // Time metrics (all in milliseconds)
  startedAt: Timestamp;
  completedAt?: Timestamp;
  durationMs?: number; // Total time for encounter
  timeToDeflectionMs?: number; // Time until deflection decision
  // Session metrics
  messageCount: number; // Total user + AI messages
  turnsCount: number; // Number of back-and-forths
  toolCallsCount?: number; // Tools invoked
  assessmentsStartedCount?: number;
  // Clinical context
  condition?: string; // Primary condition discussed
  subjects?: string[]; // Topics (vitals, medications, etc.)
  riskLevel?: RiskLevel;
  // Quality metrics
  userSatisfactionScore?: number; // 1-5 from feedback
  likedAssistant?: boolean; // Thumbs up/down flag
  feedbackText?: string;
  recommendedByUser?: boolean;
  // Evidence reference (from Phase 2)
  evidenceConfidence?: number; // 0-100, from evidence capture
  // Audit trail
  createdAt: Timestamp;
  processedForKpis?: boolean;
}

export interface DailyKpiDocument {
  profileId: string;
  date: string; // YYYY-MM-DD (UTC)
  // Encounter counts
  encountersTotal: number;
  encountersDeflected: number;
  encountersEscalated: number;
  encountersResolved: number;
  encountersAbandoned: number;
  // Deflection metrics
  deflectionRate: number; // % (0-100)
  deflectionReasons: Record<DeflectionReason, number>;
  // Efficiency metrics
  avgTimeToResolution: number; // ms
  avgTurnsCount: number;
  avgMessageCount: number;
  avgToolCallsCount?: number;
  // Quality metrics
  avgUserSatisfaction?: number; // 1-5
  userSatisfactionCount: number;
  likedCount: number;
  dislikedCount: number;
  recommendationRate?: number; // % (0-100)
  // Risk distribution
  riskDistribution: Record<RiskLevel, number>; // {low: 10, moderate: 5, ...}
  // Agent breakdown
  agentMetrics: Record<
    string,
    {
      total: number;
      deflected: number;
      avgConfidence?: number;
    }
  >;
  // Computed timing
  computedAt: Timestamp;
}

export interface WeeklyKpiDocument {
  profileId: string;
  weekStart: string; // YYYY-MM-DD (Monday)
  // Aggregated from daily KPIs
  encountersTotal: number;
  deflectionRate: number;
  avgTimeToResolution: number;
  avgUserSatisfaction?: number;
  recommendationRate?: number;
  // Trend vs previous week
  deflectionTrendPercentage?: number; // +/- change
  satisfactionTrendPercentage?: number;
  // Computed timing
  computedAt: Timestamp;
}

export interface CohortComparisonDocument {
  profileId: string;
  comparisonDate: string; // YYYY-MM-DD
  period: "week" | "month";
  // Percentiles vs cohort (doctors using same agents)
  deflectionPercentile?: number; // 0-100
  efficiencyPercentile?: number;
  satisfactionPercentile?: number;
  // Benchmark metrics
  cohortDeflectionAverage?: number;
  cohortEfficiencyAverage?: number;
  cohortSatisfactionAverage?: number;
}

// ── DTOs ───────────────────────────────────────────────────────────────────

export interface EncounterDto {
  id?: string;
  userId: string;
  agentType: string;
  sessionId: string;
  outcome: EncounterOutcome;
  deflectionReason?: DeflectionReason;
  durationMs?: number;
  messageCount: number;
  turnsCount: number;
  condition?: string;
  riskLevel?: RiskLevel;
  userSatisfactionScore?: number;
  recommendedByUser?: boolean;
  createdAt: string;
}

export interface DailyKpiDto {
  date: string;
  profileId: string;
  encountersTotal: number;
  deflectionRate: number;
  avgTimeToResolution: number;
  avgUserSatisfaction?: number;
  recommendationRate?: number;
  agentMetrics: Record<string, { total: number; deflected: number }>;
}

// ── Zod Schemas ───────────────────────────────────────────────────────────

export const CreateEncounterSchema = z.object({
  userId: z.string().min(1),
  profileId: z.string().min(1),
  agentType: z.string().min(1),
  sessionId: z.string().min(1),
  messageId: z.string().optional(),
  outcome: z.enum(["deflected", "escalated", "resolved", "abandoned"]),
  deflectionReason: z
    .enum(["self-care", "reassurance", "scheduling", "ehr_guidance", "other"])
    .optional(),
  escalationReason: z.string().optional(),
  startedAt: z.string(), // ISO-8601
  completedAt: z.string().optional(),
  durationMs: z.number().optional(),
  messageCount: z.number().int().min(1),
  turnsCount: z.number().int().min(0),
  toolCallsCount: z.number().int().optional(),
  assessmentsStartedCount: z.number().int().optional(),
  condition: z.string().optional(),
  subjects: z.array(z.string()).optional(),
  riskLevel: z.enum(["low", "moderate", "high", "emergency"]).optional(),
  userSatisfactionScore: z.number().min(1).max(5).optional(),
  likedAssistant: z.boolean().optional(),
  feedbackText: z.string().optional(),
  recommendedByUser: z.boolean().optional(),
  evidenceConfidence: z.number().min(0).max(100).optional(),
});

export const QueryEncountersSchema = z.object({
  profileId: z.string(),
  startDate: z.string(), // YYYY-MM-DD
  endDate: z.string(),
  outcome: z
    .enum(["deflected", "escalated", "resolved", "abandoned"])
    .optional(),
  agentType: z.string().optional(),
});

// ── Types ─────────────────────────────────────────────────────────────────

export type CreateEncounterInput = z.infer<typeof CreateEncounterSchema>;
export type QueryEncountersInput = z.infer<typeof QueryEncountersSchema>;

// ── Mappers ───────────────────────────────────────────────────────────────

export function toEncounterDto(
  id: string,
  doc: EncounterDocument,
): EncounterDto {
  return {
    id,
    userId: doc.userId,
    agentType: doc.agentType,
    sessionId: doc.sessionId,
    outcome: doc.outcome,
    deflectionReason: doc.deflectionReason,
    durationMs: doc.durationMs,
    messageCount: doc.messageCount,
    turnsCount: doc.turnsCount,
    condition: doc.condition,
    riskLevel: doc.riskLevel,
    userSatisfactionScore: doc.userSatisfactionScore,
    recommendedByUser: doc.recommendedByUser,
    createdAt: doc.createdAt.toDate().toISOString(),
  };
}

// ── KPI Calculation Helpers ───────────────────────────────────────────────

export function calculateDeflectionRate(
  deflected: number,
  total: number,
): number {
  return total > 0 ? Math.round((deflected / total) * 100) : 0;
}

export function calculateRecommendationRate(
  recommended: number,
  total: number,
): number {
  return total > 0 ? Math.round((recommended / total) * 100) : 0;
}

export function calculateAverageMetric(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function aggregateRiskDistribution(
  encounters: EncounterDocument[],
): Record<RiskLevel, number> {
  const dist: Record<RiskLevel, number> = {
    low: 0,
    moderate: 0,
    high: 0,
    emergency: 0,
  };
  encounters.forEach((enc) => {
    const risk = enc.riskLevel || "low";
    dist[risk]++;
  });
  return dist;
}
