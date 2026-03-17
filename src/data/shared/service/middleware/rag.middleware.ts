/**
 * RAG Middleware — Injects patient medical records and clinical guidelines.
 *
 * When `needsRag` is true, fetches semantically relevant patient records
 * (KNN + Bedrock reranking) and evidence-based guidelines in parallel,
 * then injects them into the prompt.
 *
 * When `needsRag` is false, the middleware is a no-op — saving ~1.2-1.5s
 * on queries that don't need patient context (greetings, simple triage).
 *
 * Cache-aware: when `cacheActive` is true (Google cachedContent in use),
 * system messages are forbidden — context is injected as synthetic
 * user/assistant turns instead. This matches the existing behaviour
 * where cachedContentMiddleware strips system messages.
 */

import type { LanguageModelMiddleware } from "ai";
import { ragContextBuilder } from "@/data/shared/service";
import { ragService } from "@/data/shared/service/rag/rag.service";
import { guidelineService } from "@/data/guidelines";

export interface RagMiddlewareOptions {
  agentId: string;
  userId: string;
  profileId: string;
  dependentId?: string;
  userQuery: string;
  needsRag: boolean;
  /** Pre-computed query embedding — avoids duplicate embed call. */
  queryEmbedding?: number[];
  /** Additional per-request context (e.g. attachment note). Combined with RAG. */
  dynamicContext?: string;
  /** When true, context is injected as user/assistant turns instead of system
   *  messages — required when Google cachedContent is active. */
  cacheActive?: boolean;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/**
 * Create a middleware that fetches RAG context + guidelines once and
 * injects them into the model request.
 *
 * The fetch happens on the first `transformParams` call; subsequent steps
 * in the ToolLoopAgent reuse the cached result.
 */
export function ragMiddleware(
  opts: RagMiddlewareOptions,
): LanguageModelMiddleware {
  let resolvedContext: string | null = null;
  let fetched = false;

  return {
    specificationVersion: "v3" as const,

    transformParams: async ({ params }) => {
      // Only fetch once per request — ToolLoopAgent may call multiple steps
      if (!fetched) {
        fetched = true;

        const ragParts: string[] = [];

        // Dynamic context (e.g. attachment presence note) is always included
        if (opts.dynamicContext) ragParts.push(opts.dynamicContext);

        if (opts.needsRag) {
          const t0 = performance.now();

          let queryEmbedding: number[];
          if (opts.queryEmbedding) {
            queryEmbedding = opts.queryEmbedding;
          } else {
            queryEmbedding = await ragService.embedQuery(opts.userQuery);
          }

          const [ragResult, guipelinesResult] = await Promise.allSettled([
            withTimeout(
              ragContextBuilder.buildContext({
                userId: opts.userId,
                profileId: opts.profileId,
                dependentId: opts.dependentId,
                query: opts.userQuery,
                queryEmbedding,
                rerank: true,
                limit: 15,
                rerankTopK: 5,
                rerankMinScore: 0.01,
                rerankMinScoreRatio: 0.85,
              }),
              10000,
            ),
            withTimeout(
              guidelineService
                .search(opts.userQuery, { topK: 3, queryEmbedding })
                .catch((err: unknown) => {
                  console.error(
                    `[${opts.agentId}] Guideline fetch failed:`,
                    err,
                  );
                  return [];
                }),
              10000,
            ),
          ]);

          const ragContext =
            ragResult.status === "fulfilled" && ragResult.value
              ? ragResult.value.context
              : "";
          const guidelines =
            guipelinesResult.status === "fulfilled" && guipelinesResult.value
              ? guipelinesResult.value
              : [];
          const guidelinesText =
            guidelines.length > 0
              ? guidelineService.formatForPrompt(guidelines)
              : "";

          if (guidelinesText) ragParts.push(guidelinesText);
          if (ragContext) ragParts.push(ragContext);

          console.log(
            `[${opts.agentId}] RAG+Guidelines: ${(performance.now() - t0).toFixed(0)}ms | ` +
              `RAG chunks: ${ragResult.status === "fulfilled" && ragResult.value ? ragResult.value.count : 0} | ` +
              `Guidelines: ${guidelines.length}`,
          );
        } else {
          console.log(`[${opts.agentId}] RAG skipped (needsRag=false)`);
        }

        resolvedContext = ragParts.length > 0 ? ragParts.join("\n\n") : null;
      }

      if (!resolvedContext) return params;

      if (opts.cacheActive) {
        // When cachedContent is active, system messages are forbidden.
        // Inject as synthetic user/assistant turns at the start of the
        // conversation so the model receives the context via `contents`.
        return {
          ...params,
          prompt: [
            ...params.prompt.filter((m) => m.role === "system"),
            {
              role: "user" as const,
              content: [
                {
                  type: "text" as const,
                  text: `<context>\n${resolvedContext}\n</context>`,
                },
              ],
            },
            {
              role: "assistant" as const,
              content: [
                {
                  type: "text" as const,
                  text: "I've noted the additional context and will incorporate it.",
                },
              ],
            },
            ...params.prompt.filter((m) => m.role !== "system"),
          ],
        };
      }

      // Default: prepend as a system message (must stay before user/assistant turns)
      const firstNonSystem = params.prompt.findIndex(
        (m) => m.role !== "system",
      );
      const insertAt =
        firstNonSystem === -1 ? params.prompt.length : firstNonSystem;

      return {
        ...params,
        prompt: [
          ...params.prompt.slice(0, insertAt),
          { role: "system" as const, content: resolvedContext },
          ...params.prompt.slice(insertAt),
        ],
      };
    },
  };
}
