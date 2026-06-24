/**
 * Encounter Repository — Firestore persistence for workflow outcomes and KPI data
 */

import { Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import type {
  EncounterDocument,
  DailyKpiDocument,
  CreateEncounterInput,
  EncounterDto,
} from "../models/encounter.model";
import { toEncounterDto } from "../models/encounter.model";

const profilesCol = () => db.collection("profiles");
const encountersCol = (profileId: string) =>
  profilesCol().doc(profileId).collection("encounters");
const dailyKpisCol = (profileId: string) =>
  profilesCol().doc(profileId).collection("daily_kpis");

export const encounterRepository = {
  /**
   * Create a new encounter record.
   */
  async create(
    profileId: string,
    input: CreateEncounterInput,
  ): Promise<EncounterDto> {
    const ref = encountersCol(profileId).doc();
    const startedAt = new Date(input.startedAt);
    const completedAt = input.completedAt
      ? new Date(input.completedAt)
      : new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    const doc: EncounterDocument = {
      userId: input.userId,
      profileId: input.profileId,
      agentType: input.agentType,
      sessionId: input.sessionId,
      messageId: input.messageId,
      outcome: input.outcome,
      deflectionReason: input.deflectionReason,
      escalationReason: input.escalationReason,
      startedAt: Timestamp.fromDate(startedAt),
      completedAt: completedAt ? Timestamp.fromDate(completedAt) : undefined,
      durationMs: durationMs > 0 ? durationMs : undefined,
      timeToDeflectionMs:
        input.outcome === "deflected" ? durationMs : undefined,
      messageCount: input.messageCount,
      turnsCount: input.turnsCount,
      toolCallsCount: input.toolCallsCount,
      assessmentsStartedCount: input.assessmentsStartedCount,
      condition: input.condition,
      subjects: input.subjects,
      riskLevel: input.riskLevel,
      userSatisfactionScore: input.userSatisfactionScore,
      likedAssistant: input.likedAssistant,
      feedbackText: input.feedbackText,
      recommendedByUser: input.recommendedByUser,
      evidenceConfidence: input.evidenceConfidence,
      createdAt: Timestamp.now(),
      processedForKpis: false,
    };

    await ref.set(doc);
    return toEncounterDto(ref.id, doc);
  },

  /**
   * Get encounter by ID.
   */
  async getById(
    profileId: string,
    encounterId: string,
  ): Promise<EncounterDto | null> {
    const snap = await encountersCol(profileId).doc(encounterId).get();
    if (!snap.exists) return null;
    return toEncounterDto(snap.id, snap.data() as EncounterDocument);
  },

  /**
   * Query encounters for a date range.
   */
  async queryByDateRange(
    profileId: string,
    startDate: string,
    endDate: string,
    opts?: {
      outcome?: string;
      agentType?: string;
    },
  ): Promise<EncounterDto[]> {
    const startTs = Timestamp.fromDate(new Date(startDate));
    const endTs = Timestamp.fromDate(new Date(endDate + "T23:59:59"));

    let query = encountersCol(profileId)
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<=", endTs);

    if (opts?.outcome) {
      query = query.where("outcome", "==", opts.outcome);
    }
    if (opts?.agentType) {
      query = query.where("agentType", "==", opts.agentType);
    }

    const snap = await query.get();
    return snap.docs.map((d) =>
      toEncounterDto(d.id, d.data() as EncounterDocument),
    );
  },

  /**
   * Update encounter with user feedback/satisfaction.
   */
  async updateFeedback(
    profileId: string,
    encounterId: string,
    feedback: {
      userSatisfactionScore?: number;
      likedAssistant?: boolean;
      feedbackText?: string;
      recommendedByUser?: boolean;
    },
  ): Promise<void> {
    await encountersCol(profileId).doc(encounterId).update(feedback);
  },

  /**
   * Mark encounter as processed for KPI aggregation.
   */
  async markProcessedForKpis(
    profileId: string,
    encounterId: string,
  ): Promise<void> {
    await encountersCol(profileId)
      .doc(encounterId)
      .update({ processedForKpis: true });
  },

  /**
   * Store daily KPI aggregate.
   */
  async saveDailyKpi(profileId: string, kpi: DailyKpiDocument): Promise<void> {
    const ref = dailyKpisCol(profileId).doc(kpi.date);
    await ref.set(kpi);
  },

  /**
   * Get daily KPI by date.
   */
  async getDailyKpi(
    profileId: string,
    date: string,
  ): Promise<DailyKpiDocument | null> {
    const snap = await dailyKpisCol(profileId).doc(date).get();
    if (!snap.exists) return null;
    return snap.data() as DailyKpiDocument;
  },

  /**
   * Query daily KPIs for a date range.
   */
  async queryDailyKpisByRange(
    profileId: string,
    startDate: string,
    endDate: string,
  ): Promise<DailyKpiDocument[]> {
    const snap = await dailyKpisCol(profileId)
      .where("date", ">=", startDate)
      .where("date", "<=", endDate)
      .orderBy("date", "desc")
      .get();
    return snap.docs.map((d) => d.data() as DailyKpiDocument);
  },

  /**
   * Delete old encounters (retention policy, e.g., >180 days).
   */
  async deleteOldEncounters(
    profileId: string,
    olderThanDays: number = 180,
  ): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    const ts = Timestamp.fromDate(cutoff);

    const snap = await encountersCol(profileId)
      .where("createdAt", "<", ts)
      .limit(500) // Batch size
      .get();

    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    return snap.size;
  },
};
