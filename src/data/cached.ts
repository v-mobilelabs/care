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
} as const;

// ── Cached usage (credits / minutes / storage) ──────────────────────────────

export async function getCachedUsage(userId: string) {
  "use cache";
  cacheTag(CacheTags.usage(userId));
  cacheLife("seconds"); // stale 30s, revalidate 1s, expire 1min

  const { GetUsageUseCase } = await import(
    "@/data/usage/use-cases/get-usage.use-case"
  );
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

  const { ListAllFilesUseCase } = await import("@/data/sessions");
  return new ListAllFilesUseCase().execute({ userId });
}
