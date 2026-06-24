/**
 * Memory Middleware — Injects saved patient memories into the prompt.
 *
 * Fetches long-term memories for the patient profile and prepends them
 * as a system message so the agent has cross-session context.
 *
 * Like ragMiddleware, the fetch happens once per request — subsequent
 * ToolLoopAgent steps reuse the cached result.
 */

import type { LanguageModelMiddleware } from "ai";
import { memoryService } from "@/data/memory/service/memory.service";

export interface MemoryMiddlewareOptions {
  agentId: string;
  profileId: string;
  /** When true, context is injected as user/assistant turns instead of system
   *  messages — required when Google cachedContent is active. */
  cacheActive?: boolean;
}

// ── Injection helpers ─────────────────────────────────────────────────────────

type Prompt = Parameters<
  NonNullable<LanguageModelMiddleware["transformParams"]>
>[0]["params"];

function injectAsTurns(params: Prompt, memory: string): Prompt {
  return {
    ...params,
    prompt: [
      ...params.prompt.filter((m: { role: string }) => m.role === "system"),
      {
        role: "user" as const,
        content: [
          {
            type: "text" as const,
            text: `<long_term_memory>\n${memory}\n</long_term_memory>`,
          },
        ],
      },
      {
        role: "assistant" as const,
        content: [
          {
            type: "text" as const,
            text: "I've loaded the patient's long-term memories.",
          },
        ],
      },
      ...params.prompt.filter((m: { role: string }) => m.role !== "system"),
    ],
  };
}

function injectAsSystem(params: Prompt, memory: string): Prompt {
  const insertAt = params.prompt.findIndex(
    (m: { role: string }) => m.role !== "system",
  );
  const idx = insertAt === -1 ? params.prompt.length : insertAt;
  return {
    ...params,
    prompt: [
      ...params.prompt.slice(0, idx),
      { role: "system" as const, content: memory },
      ...params.prompt.slice(idx),
    ],
  };
}

// ── Middleware factory ─────────────────────────────────────────────────────────

async function fetchMemory(
  opts: MemoryMiddlewareOptions,
): Promise<string | null> {
  try {
    const memory = await memoryService.formatForPrompt(opts.profileId);
    console.log(
      `[${opts.agentId}] Memory: ${memory ? "loaded" : "none found"}`,
    );
    return memory;
  } catch (err) {
    console.error(`[${opts.agentId}] Memory fetch failed:`, err);
    return null;
  }
}

export function memoryMiddleware(
  opts: MemoryMiddlewareOptions,
): LanguageModelMiddleware {
  let resolvedMemory: string | null = null;
  let fetched = false;
  return {
    specificationVersion: "v3" as const,
    transformParams: async ({ params }) => {
      if (!fetched) {
        fetched = true;
        resolvedMemory = await fetchMemory(opts);
      }
      if (!resolvedMemory) return params;
      return opts.cacheActive
        ? injectAsTurns(params, resolvedMemory)
        : injectAsSystem(params, resolvedMemory);
    },
  };
}
