/**
 * Server-side cached data functions using Next.js 16 "use cache" directive.
 *
 * Each function wraps an existing use case with `cacheTag` for on-demand
 * invalidation and `cacheLife` for automatic expiry. The cache is keyed
 * per-user via the userId argument.
 *
 * Invalidate via `revalidateTag("usage:{userId}")`, etc.
 */
import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { ReferralSortDir, ReferralStatus } from "@/data/referrals";
import type { DailyKpiDocument } from "@/data/encounters";
import { encounterRepository } from "@/data/encounters";

import { CacheTags } from "@/data/cache-tags";
export { CacheTags };

function normalizeCacheQuery(query: string): string {
  return query.toLowerCase().replaceAll(/\s+/g, " ").trim();
}

// ── Cached usage (credits / minutes / storage) ──────────────────────────────

export async function getCachedUsage(userId: string) {
  "use cache";
  cacheTag(CacheTags.usage(userId));
  cacheLife("seconds"); // stale 30s, revalidate 1s, expire 1min

  const { GetUsageUseCase } =
    await import("@/data/usage/use-cases/get-usage.use-case");
  const usage = await new GetUsageUseCase().execute({ profile: userId });
  return {
    credits: usage.credits,
    minutes: usage.minutes,
    storage: usage.storage,
    lastReset: usage.lastReset,
  };
}

// ── Cached profile ──────────────────────────────────────────────────────────

export async function getCachedProfile(userId: string) {
  "use cache";
  cacheTag(CacheTags.profile(userId));
  cacheLife("minutes"); // stale 5min, revalidate 1min, expire 1hr

  const { GetProfileUseCase } = await import("@/data/profile");
  return (await new GetProfileUseCase().execute({ userId })) ?? { userId };
}

// ── Cached files ────────────────────────────────────────────────────────────

export async function getCachedFiles(userId: string) {
  "use cache";
  cacheTag(CacheTags.files(userId));
  cacheLife("minutes"); // stale 5min, revalidate 1min, expire 1hr

  const { ListAllFilesUseCase } = await import("@/data/files");
  return new ListAllFilesUseCase().execute({
    userId,
    profileId: userId,
    limit: 20,
  });
}

export interface CachedFilesFilters {
  label?:
    | "xray"
    | "blood_test"
    | "prescription"
    | "scan"
    | "report"
    | "vaccination"
    | "other";
  mimeType?: string;
  q?: string;
  sortDir?: "asc" | "desc";
  limit?: number;
}

export async function getCachedFilesWithFilters(
  userId: string,
  filters: CachedFilesFilters,
) {
  "use cache";
  cacheTag(CacheTags.files(userId));
  cacheLife("minutes");

  const { ListAllFilesUseCase } = await import("@/data/files");
  return new ListAllFilesUseCase().execute({
    userId,
    profileId: userId,
    limit: filters.limit ?? 20,
    ...(filters.label ? { label: filters.label } : {}),
    ...(filters.mimeType ? { mimeType: filters.mimeType } : {}),
    ...(filters.q ? { q: filters.q } : {}),
    ...(filters.sortDir ? { sortDir: filters.sortDir } : {}),
  });
}

// ── Cached memories (formatted for prompt injection) ────────────────────────

export async function getCachedMemories(profileId: string): Promise<string> {
  "use cache";
  cacheTag(CacheTags.memories(profileId));
  cacheLife("minutes"); // stale 5min, revalidate 1min, expire 1hr

  const { memoryService } =
    await import("@/data/memory/service/memory.service");
  return memoryService.formatForPrompt(profileId);
}

// ── Cached patient health data ──────────────────────────────────────────────

export async function getCachedPatient(userId: string) {
  "use cache";
  cacheTag(CacheTags.patient(userId));
  cacheLife("minutes");

  const { GetPatientUseCase } = await import("@/data/patients");
  return new GetPatientUseCase().execute({ userId });
}

// ── Cached medications ──────────────────────────────────────────────────────

export async function getCachedMedications(userId: string) {
  "use cache";
  cacheTag(CacheTags.medications(userId));
  cacheLife("minutes");

  const { ListMedicationsUseCase } = await import("@/data/medications");
  return new ListMedicationsUseCase().execute({ userId });
}

export interface CachedMedicationsFilters {
  status?: "active" | "completed" | "discontinued" | "paused";
  q?: string;
  sortDir?: "asc" | "desc";
  limit?: number;
  cursor?: string;
}

export async function getCachedMedicationsWithFilters(
  userId: string,
  filters: CachedMedicationsFilters,
) {
  "use cache";
  cacheTag(CacheTags.medications(userId));
  cacheLife("minutes");

  const { ListMedicationsPaginatedUseCase } =
    await import("@/data/medications");
  return new ListMedicationsPaginatedUseCase().execute({
    userId,
    limit: filters.limit ?? 20,
    ...(filters.cursor ? { cursor: filters.cursor } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.q ? { q: filters.q } : {}),
    ...(filters.sortDir ? { sortDir: filters.sortDir } : {}),
  });
}

export async function getCachedMedicationMatches(args: {
  userId: string;
  profileId: string;
  query: string;
  limit?: number;
}) {
  "use cache";
  const normalizedQuery = normalizeCacheQuery(args.query);
  cacheTag(CacheTags.medicationMatchUser(args.userId));
  cacheTag(CacheTags.medicationMatch(args.userId, normalizedQuery));
  cacheLife("minutes");

  const { runMedicationMatchGraph } =
    await import("@/workflow/medication-match.workflow");

  const req = new Request("http://internal/api/medications/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: args.query,
      ...(args.limit ? { limit: args.limit } : {}),
    }),
  });

  return runMedicationMatchGraph({
    userId: args.userId,
    profileId: args.profileId,
    req,
  });
}

// ── Cached vitals ───────────────────────────────────────────────────────────

export async function getCachedVitals(userId: string) {
  "use cache";
  cacheTag(CacheTags.vitals(userId));
  cacheLife("minutes");

  const { ListVitalsUseCase } = await import("@/data/vitals");
  return new ListVitalsUseCase().execute({ userId });
}

// ── Cached conditions ───────────────────────────────────────────────────────

export async function getCachedConditions(userId: string) {
  "use cache";
  cacheTag(CacheTags.conditions(userId));
  cacheLife("minutes");

  const { ListConditionsUseCase } = await import("@/data/conditions");
  return new ListConditionsUseCase().execute({ userId, limit: 100 });
}

// ── Cached assessments ──────────────────────────────────────────────────────

export async function getCachedAssessments(userId: string) {
  "use cache";
  cacheTag(CacheTags.assessments(userId));
  cacheLife("minutes");

  const { ListAssessmentsUseCase } = await import("@/data/assessments");
  return new ListAssessmentsUseCase().execute({ userId, limit: 20 });
}

// ── Cached sessions ─────────────────────────────────────────────────────────

export async function getCachedSessions(userId: string) {
  "use cache";
  cacheTag(CacheTags.sessions(userId));
  cacheLife("seconds");

  const { ListSessionsUseCase } = await import("@/data/sessions");
  return new ListSessionsUseCase().execute({ userId, profileId: userId });
}

export interface CachedSessionsFilters {
  agent?: string;
  q?: string;
  sortDir?: "asc" | "desc";
  limit?: number;
}

export async function getCachedSessionsWithFilters(
  userId: string,
  filters: CachedSessionsFilters,
) {
  "use cache";
  cacheTag(CacheTags.sessions(userId));
  cacheLife("seconds");

  const { ListSessionsPaginatedUseCase } = await import("@/data/sessions");
  return new ListSessionsPaginatedUseCase().execute({
    userId,
    profileId: userId,
    limit: filters.limit ?? 20,
    ...(filters.agent ? { agent: filters.agent } : {}),
    ...(filters.q ? { q: filters.q } : {}),
    ...(filters.sortDir ? { sortDir: filters.sortDir } : {}),
  });
}

// ── Cached patient summaries ────────────────────────────────────────────────

export async function getCachedPatientSummaries(userId: string) {
  "use cache";
  cacheTag(CacheTags.patientSummaries(userId));
  cacheLife("minutes");

  const { ListPatientSummariesUseCase } =
    await import("@/data/patient-summary");
  return new ListPatientSummariesUseCase().execute({ userId, limit: 20 });
}

export async function getCachedPatientSummary(userId: string) {
  "use cache";
  cacheTag(CacheTags.patientSummaries(userId));
  cacheLife("minutes");

  const { GetPatientSummaryUseCase } = await import("@/data/patient-summary");
  return new GetPatientSummaryUseCase().execute({ userId });
}
// ── Cached symptom observations ──────────────────────────────────────────────

export async function getCachedSymptomObservations(userId: string) {
  "use cache";
  cacheTag(CacheTags.symptomObservations(userId));
  cacheLife("minutes");

  const { ListSymptomObservationsUseCase } =
    await import("@/data/symptom-observations");
  return new ListSymptomObservationsUseCase().execute({ userId });
}

// ── Cached referrals ─────────────────────────────────────────────────────────

export async function getCachedReferrals(userId: string) {
  "use cache";
  cacheTag(CacheTags.referrals(userId));
  cacheLife("minutes");

  const { ListReferralsUseCase } = await import("@/data/referrals");
  return new ListReferralsUseCase().execute({ userId, limit: 20 });
}

export interface CachedReferralsFilters {
  status?: ReferralStatus;
  specialist?: string;
  q?: string;
  sortDir?: ReferralSortDir;
  limit?: number;
}

export async function getCachedReferralsWithFilters(
  userId: string,
  filters: CachedReferralsFilters,
) {
  "use cache";
  cacheTag(CacheTags.referrals(userId));
  cacheLife("minutes");

  const { ListReferralsUseCase } = await import("@/data/referrals");
  return new ListReferralsUseCase().execute({
    userId,
    limit: filters.limit ?? 20,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.specialist ? { specialist: filters.specialist } : {}),
    ...(filters.q ? { q: filters.q } : {}),
    ...(filters.sortDir ? { sortDir: filters.sortDir } : {}),
  });
}

// ── Cached aggregated metrics ───────────────────────────────────────────────

export async function getCachedMetricsAggregated(
  profileId: string,
  startDate: string,
  endDate: string,
): Promise<DailyKpiDocument[]> {
  "use cache";
  cacheTag(CacheTags.metrics(profileId));
  cacheLife("minutes");

  return encounterRepository.queryDailyKpisByRange(
    profileId,
    startDate,
    endDate,
  );
}
