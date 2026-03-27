/**
 * Pre-Context Middleware — Lightweight injector for pre-fetched context.
 *
 * When PrepareChatUseCase has already run preflight checks, memory fetch,
 * and gateway orchestration (including conditional RAG), this middleware
 * simply injects the cached results into the
 * prompt — replacing the full guardrail → credit → memory → RAG chain.
 *
 * Cache-aware: when Google cachedContent is active, context is injected as
 * synthetic user/assistant turns instead of system messages.
 */

import type { LanguageModelMiddleware } from "ai";
import type { PreRunContext } from "./pre-run";

export interface PreContextOptions {
  agentId: string;
  preContext: PreRunContext;
  /** Additional per-request dynamic context (e.g. attachment note, profile). */
  dynamicContext?: string;
  /** When true, inject as turns (Google cachedContent forbids system msgs). */
  cacheActive: boolean;
}

type Prompt = Parameters<
  NonNullable<LanguageModelMiddleware["transformParams"]>
>[0]["params"];

// ── Injection helpers ─────────────────────────────────────────────────────────

function injectAsSystem(params: Prompt, content: string): Prompt {
  const firstNonSystem = params.prompt.findIndex(
    (m: { role: string }) => m.role !== "system",
  );
  const idx = firstNonSystem === -1 ? params.prompt.length : firstNonSystem;
  return {
    ...params,
    prompt: [
      ...params.prompt.slice(0, idx),
      { role: "system" as const, content },
      ...params.prompt.slice(idx),
    ],
  };
}

function injectAsTurns(params: Prompt, content: string): Prompt {
  return {
    ...params,
    prompt: [
      ...params.prompt.filter((m: { role: string }) => m.role === "system"),
      {
        role: "user" as const,
        content: [
          { type: "text" as const, text: `<context>\n${content}\n</context>` },
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
      ...params.prompt.filter((m: { role: string }) => m.role !== "system"),
    ],
  };
}

// ── Middleware factory ─────────────────────────────────────────────────────────

/**
 * Create a middleware that injects pre-fetched memory, RAG context, and
 * dynamic context into the prompt. Runs once on the first transformParams
 * call — subsequent ToolLoopAgent steps reuse the same injection.
 */
export function preContextMiddleware(
  opts: PreContextOptions,
): LanguageModelMiddleware {
  let injected = false;

  return {
    specificationVersion: "v3" as const,

    transformParams: async ({ params }) => {
      if (injected) return params;
      injected = true;

      // Assemble all context parts
      const parts: string[] = [];
      if (opts.dynamicContext) parts.push(opts.dynamicContext);
      if (opts.preContext.memory) {
        parts.push(
          `<long_term_memory>\n${opts.preContext.memory}\n</long_term_memory>`,
        );
      }
      if (opts.preContext.ragContext) parts.push(opts.preContext.ragContext);

      if (opts.preContext.ragMeta.used && !opts.preContext.ragContext) {
        parts.push(
          `<rag_status>Retrieval context is currently limited (${opts.preContext.ragMeta.timedOut ? "timeout" : "no-matches"}). Ask focused follow-up questions before making definitive claims.</rag_status>`,
        );
      }

      if (opts.preContext.ragMeta.partialFailure) {
        parts.push(
          "<rag_status>Some retrieval sources were unavailable for this turn. Use conservative language and request missing details when needed.</rag_status>",
        );
      }

      if (parts.length === 0) {
        console.log(`[${opts.agentId}] preContext: no context to inject`);
        return params;
      }

      const combined = parts.join("\n\n");
      console.log(
        `[${opts.agentId}] preContext: injecting ${combined.length} chars (cache: ${opts.cacheActive})`,
      );

      return opts.cacheActive
        ? injectAsTurns(params, combined)
        : injectAsSystem(params, combined);
    },
  };
}
