/**
 * Pre-Run Context — Pre-flight checks (guardrail, credit) + memory fetch.
 *
 * Intentionally slim. RAG and routing now live in the LangGraph Gateway
 * Orchestrator (`langgraph-gateway-orchestrator.service.ts`).
 *
 * Exports:
 *   runPreflightChecks()  — guardrail + credit gate. Throws before RAG starts.
 *   fetchMemory()         — memory string with configurable timeout.
 *   PreRunContext         — shape expected by preContextMiddleware.
 *   MEMORY_TIMEOUT_MS     — shared constant for parallel coordination.
 */

import {
  runGuardrailCheck,
  runRegexGuardrailCheck,
} from "@/data/shared/service/middleware/guardrail.middleware";
import { UsageService } from "@/data/usage/service/lazy-reset-usage.service";
import { UsageRepository } from "@/data/usage/repositories/usage.repository";
import { CreditsExhaustedError } from "@/lib/errors";
import { getCachedMemories } from "@/data/cached";
import type { RagEvaluationMeta } from "@/workflow/rag-orchestrator.workflow";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PreRunContext {
  /** Formatted patient memories for prompt injection. */
  memory: string | null;
  /** Combined RAG context + guidelines for prompt injection. */
  ragContext: string | null;
  /** Pre-computed query embedding (reused by agent if needed). */
  queryEmbedding?: number[];
  /** Diagnostics for prompt fallback behavior and observability. */
  ragMeta: {
    requested: boolean;
    used: boolean;
    reused?: boolean;
    reason: string;
    timedOut: boolean;
    partialFailure: boolean;
    evaluation?: RagEvaluationMeta;
  };
}

export interface PreflightInput {
  userId: string;
  /** Text used for guardrail classification (original user message). */
  userQuery: string;
  /** Skip guardrail for trusted continuation turns (tool-output auto-send). */
  skipGuardrail?: boolean;
  /**
   * When true, only run regex-based guardrail (0 ms) and skip the LLM
   * classification. The unified preflight LLM call handles safety instead.
   */
  regexOnly?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const usageService = new UsageService(new UsageRepository());

const DEFAULT_MEMORY_TIMEOUT_MS = 5000;

function parseTimeoutFromEnv(
  key: "AI_MEMORY_TIMEOUT_MS",
  fallback: number,
): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const MEMORY_TIMEOUT_MS = parseTimeoutFromEnv(
  "AI_MEMORY_TIMEOUT_MS",
  DEFAULT_MEMORY_TIMEOUT_MS,
);

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

// ── Pre-flight checks ─────────────────────────────────────────────────────────

/**
 * Execute guardrail check + credit gate.
 *
 * Throws `GuardrailError` or `CreditsExhaustedError` — both are caught by
 * `WithContext` and returned as appropriate HTTP error responses before the
 * stream ever starts.
 *
 * This function must be called BEFORE the orchestrator and memory fetch so
 * that blocked / exhausted requests fail fast without wasting RAG budget.
 */
export async function runPreflightChecks(input: PreflightInput): Promise<void> {
  if (!input.skipGuardrail) {
    if (input.regexOnly) {
      runRegexGuardrailCheck(input.userQuery);
    } else {
      await runGuardrailCheck({
        userId: input.userId,
        userQuery: input.userQuery.trim(),
      });
    }
  }

  const remaining = await usageService.consumeCredit(input.userId);
  if (remaining < 0) throw new CreditsExhaustedError(0);
}

/**
 * Standalone credit consumption check. Throws `CreditsExhaustedError` if
 * the user has no credits remaining. Can be called in parallel with other
 * operations (orchestrator, memory fetch) for latency savings.
 */
export async function consumeCredit(userId: string): Promise<void> {
  const remaining = await usageService.consumeCredit(userId);
  if (remaining < 0) throw new CreditsExhaustedError(0);
}

// ── Memory fetch ──────────────────────────────────────────────────────────────

/**
 * Fetch the user's formatted memory string with a timeout guard.
 * Returns null on timeout or error — the agent degrades gracefully.
 */
export async function fetchMemory(profileId: string): Promise<string | null> {
  return withTimeout(
    getCachedMemories(profileId).catch((err: unknown) => {
      console.error("[fetchMemory] Memory fetch failed:", err);
      return null;
    }),
    MEMORY_TIMEOUT_MS,
  );
}
