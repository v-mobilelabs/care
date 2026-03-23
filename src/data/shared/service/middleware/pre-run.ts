/**
 * Pre-Run Context — Prefetch guardrail, credit, memory, and RAG before streaming.
 *
 * Runs all expensive checks/fetches once in PrepareChatUseCase so the agent
 * can use the lightweight `preContextMiddleware` instead of the full
 * guardrail → credit → memory → RAG middleware chain.
 *
 * Benefits:
 * - Guardrail + credit failures throw BEFORE the stream starts (cleaner errors)
 * - Memory + RAG fetch in parallel (faster than sequential middleware)
 * - Agent stream() skips repeated fetches in multi-step tool loops
 */

import { runGuardrailCheck } from "@/data/shared/service/middleware/guardrail.middleware";
import { UsageService } from "@/data/usage/service/lazy-reset-usage.service";
import { UsageRepository } from "@/data/usage/repositories/usage.repository";
import { CreditsExhaustedError } from "@/lib/errors";
import { getCachedMemories } from "@/data/cached";
import { ragContextBuilder } from "@/data/shared/service";
import { ragService } from "@/data/shared/service/rag/rag.service";
import { knowledgeBaseService } from "@/data/knowledge-base";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PreRunContext {
  /** Formatted patient memories for prompt injection. */
  memory: string | null;
  /** Combined RAG context + guidelines for prompt injection. */
  ragContext: string | null;
  /** Pre-computed query embedding (reused by agent if needed). */
  queryEmbedding?: number[];
}

export interface PrefetchInput {
  userId: string;
  profileId: string;
  dependentId?: string;
  userQuery: string;
  needsRag: boolean;
  hasAttachment?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const usageService = new UsageService(new UsageRepository());

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

// ── Prefetch ──────────────────────────────────────────────────────────────────

/**
 * Run guardrail + credit gate, then fetch memory + RAG context in parallel.
 *
 * Throws `GuardrailError` or `CreditsExhaustedError` before any expensive
 * fetches — caught by `WithContext` → appropriate HTTP status.
 */
export async function prefetchContext(
  input: PrefetchInput,
): Promise<PreRunContext> {
  const { userId, profileId, dependentId, userQuery, needsRag } = input;

  // ── 1. Guardrail (throws on block) ─────────────────────────────────────
  await runGuardrailCheck({ userId, userQuery });

  // ── 2. Credit gate (atomic, throws on exhaustion) ─────────────────────
  const remaining = await usageService.consumeCredit(userId);
  if (remaining < 0) throw new CreditsExhaustedError(0);

  // ── 3. Parallel fetch: embedding + memory, then RAG ─────────────────
  // Embedding and memory are independent — start both immediately.
  // RAG depends on the embedding result, so it chains after embedding.
  const memoryPromise = withTimeout(
    getCachedMemories(profileId).catch((err: unknown) => {
      console.error("[prefetchContext] Memory fetch failed:", err);
      return null;
    }),
    5000,
  );

  let queryEmbedding: number[] | undefined;
  const ragPromise: Promise<string | null> = needsRag
    ? ragService.embedQuery(userQuery).then((emb) => {
        queryEmbedding = emb;
        return withTimeout(
          fetchRagContext({
            userId,
            profileId,
            dependentId,
            userQuery,
            queryEmbedding: emb,
          }),
          10000,
        );
      })
    : Promise.resolve(null);

  const [memoryResult, ragResult] = await Promise.allSettled([
    memoryPromise,
    ragPromise,
  ]);

  const memory =
    memoryResult.status === "fulfilled" ? memoryResult.value : null;
  const ragContext = ragResult.status === "fulfilled" ? ragResult.value : null;

  return { memory, ragContext, queryEmbedding };
}

// ── RAG helper ────────────────────────────────────────────────────────────────

async function fetchRagContext(opts: {
  userId: string;
  profileId: string;
  dependentId?: string;
  userQuery: string;
  queryEmbedding: number[];
}): Promise<string | null> {
  const [ragResult, kbResult] = await Promise.allSettled([
    ragContextBuilder.buildContext({
      userId: opts.userId,
      profileId: opts.profileId,
      dependentId: opts.dependentId,
      query: opts.userQuery,
      queryEmbedding: opts.queryEmbedding,
      rerank: true,
      limit: 15,
      rerankTopK: 5,
      rerankMinScore: 0.01,
      rerankMinScoreRatio: 0.85,
    }),
    knowledgeBaseService
      .search(opts.userQuery, { topK: 5, queryEmbedding: opts.queryEmbedding })
      .catch((err: unknown) => {
        console.error("[prefetchContext] Knowledge base fetch failed:", err);
        return [];
      }),
  ]);

  const parts: string[] = [];

  const ragContext =
    ragResult.status === "fulfilled" && ragResult.value
      ? ragResult.value.context
      : "";
  const kbEntries =
    kbResult.status === "fulfilled" && kbResult.value ? kbResult.value : [];
  const kbText =
    kbEntries.length > 0 ? knowledgeBaseService.formatForPrompt(kbEntries) : "";

  if (kbText) parts.push(kbText);
  if (ragContext) parts.push(ragContext);

  return parts.length > 0 ? parts.join("\n\n") : null;
}
