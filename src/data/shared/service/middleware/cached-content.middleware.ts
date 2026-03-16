/**
 * Cached Content Middleware — Strips system/tools when Google cache is active.
 *
 * Google's GenerateContent API rejects requests that include
 * `system_instruction`, `tools`, or `toolConfig` alongside `cachedContent`.
 * This middleware detects the presence of `cachedContent` in providerOptions
 * and removes the conflicting fields.
 *
 * The cached content resource already contains the system prompt and tool
 * declarations, so they don't need to be sent again. The ToolLoopAgent
 * retains the tools locally for executing tool calls.
 *
 * Also handles context-cache creation via `contextCacheService`.
 */

import type { LanguageModelMiddleware, ToolSet } from "ai";
import { z } from "zod";
import {
  contextCacheService,
  type GoogleToolDeclaration,
} from "@/data/shared/service/context-cache.service";

// ── Strip middleware ──────────────────────────────────────────────────────────

/**
 * When `providerOptions.google.cachedContent` is present, strips system
 * messages, tools, and toolChoice from the request so the Google API
 * accepts it alongside the cached content resource.
 */
export const cachedContentMiddleware: LanguageModelMiddleware = {
  specificationVersion: "v3" as const,

  transformParams: async ({ params }) => {
    const googleOpts = params.providerOptions?.google as
      | Record<string, unknown>
      | undefined;
    if (!googleOpts?.cachedContent) return params;

    return {
      ...params,
      prompt: params.prompt.filter((m) => m.role !== "system"),
      tools: undefined,
      toolChoice: undefined,
    };
  },
};

// ── Cache helpers ─────────────────────────────────────────────────────────────

/**
 * Convert AI SDK tools (Zod schemas) to Google functionDeclarations format
 * for inclusion in a cachedContent resource.
 */
export function toolsToGoogleDeclarations(
  tools: ToolSet,
): GoogleToolDeclaration[] {
  return Object.entries(tools).map(([name, t]) => {
    const toolAny = t as {
      parameters?: unknown;
      inputSchema?: { jsonSchema?: Record<string, unknown> };
      description?: string;
    };

    let raw: Record<string, unknown>;
    if (toolAny.inputSchema?.jsonSchema) {
      raw = toolAny.inputSchema.jsonSchema;
    } else if (toolAny.parameters) {
      raw = z.toJSONSchema(
        toolAny.parameters as Parameters<typeof z.toJSONSchema>[0],
      ) as Record<string, unknown>;
    } else {
      raw = { type: "object", properties: {} };
    }

    const { $schema: _, additionalProperties: __, ...parameters } = raw;
    return {
      name,
      description: toolAny.description ?? "",
      parameters,
    };
  });
}

/**
 * Try to get or create a Google context cache for the given agent.
 * Returns the cache name or null if caching isn't available.
 */
export async function getContextCache(
  agentId: string,
  modelId: string,
  systemPrompt: string,
  tools: ToolSet,
): Promise<string | null> {
  const toolDeclarations = toolsToGoogleDeclarations(tools);
  return contextCacheService
    .getOrCreate(agentId, modelId, systemPrompt, toolDeclarations)
    .catch(() => null);
}
