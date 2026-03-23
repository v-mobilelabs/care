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

// ── Cache tag helpers ─────────────────────────────────────────────────────────

export const CacheTags = {
  usage: (userId: string) => `usage:${userId}`,
  profile: (userId: string) => `profile:${userId}`,
  files: (userId: string) => `files:${userId}`,
  memories: (profileId: string) => `memories:${profileId}`,
  patient: (userId: string) => `patient:${userId}`,
  medications: (userId: string) => `medications:${userId}`,
  assessments: (userId: string) => `assessments:${userId}`,
  dependents: (userId: string) => `dependents:${userId}`,
  sessions: (userId: string) => `sessions:${userId}`,
  vitals: (userId: string) => `vitals:${userId}`,
  patientSummaries: (userId: string) => `patient-summaries:${userId}`,
  conditions: (userId: string) => `conditions:${userId}`,
} as const;

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
  return new ListAllFilesUseCase().execute({ userId, limit: 20 });
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

// ── Cached vitals ───────────────────────────────────────────────────────────

export async function getCachedVitals(userId: string) {
  "use cache";
  cacheTag(CacheTags.vitals(userId));
  cacheLife("minutes");

  const { ListVitalsUseCase } = await import("@/data/vitals");
  return new ListVitalsUseCase().execute({ userId });
}

// ── Cached assessments ──────────────────────────────────────────────────────

export async function getCachedAssessments(userId: string) {
  "use cache";
  cacheTag(CacheTags.assessments(userId));
  cacheLife("minutes");

  const { ListAssessmentsUseCase } = await import("@/data/assessments");
  return new ListAssessmentsUseCase().execute({ userId, limit: 20 });
}

// ── Cached dependents ───────────────────────────────────────────────────────

export async function getCachedDependents(userId: string) {
  "use cache";
  cacheTag(CacheTags.dependents(userId));
  cacheLife("minutes");

  const { ListDependentsUseCase } = await import("@/data/dependents");
  return new ListDependentsUseCase().execute({ ownerId: userId });
}

// ── Cached sessions ─────────────────────────────────────────────────────────

export async function getCachedSessions(userId: string) {
  "use cache";
  cacheTag(CacheTags.sessions(userId));
  cacheLife("seconds");

  const { ListSessionsUseCase } = await import("@/data/sessions");
  return new ListSessionsUseCase().execute({ userId, profileId: userId });
}

// ── Cached patient summaries ────────────────────────────────────────────────

export async function getCachedPatientSummaries(userId: string) {
  "use cache";
  cacheTag(CacheTags.patientSummaries(userId));
  cacheLife("minutes");

  const { ListPatientSummariesUseCase } =
    await import("@/data/patient-summary");
  return new ListPatientSummariesUseCase().execute({ userId });
}
