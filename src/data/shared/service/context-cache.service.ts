/**
 * Google Gemini Context Caching Service
 *
 * Creates and manages explicit server-side cached content using Google's
 * cachedContents API. When the same agent's static system prompt is sent
 * repeatedly across multi-turn conversations, using a cache resource
 * avoids re-processing the prompt tokens on every request — reducing
 * both latency and cost.
 *
 * Flow:
 * 1. Agent calls `getOrCreate(agentId, modelId, systemPrompt)`
 * 2. If a valid (non-expired) cache exists for that agent, return its name
 * 3. Otherwise, POST to Google cachedContents API to create a new one
 * 4. Return the name (e.g. `cachedContents/abc123`) for use in providerOptions
 *
 * Cache entries have a 30-minute TTL and are refreshed automatically.
 * In-memory map tracks entries so we never call the API redundantly.
 *
 * Limitations:
 * - Google requires ≥ 4 096 tokens of content to cache (≈ 2 000 words).
 *   Short prompts will gracefully fall back to no caching.
 * - Only caches the static system prompt. Dynamic content (RAG, guidelines)
 *   changes every request and cannot be cached.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

/** A single Google function declaration for the cachedContents API. */
export interface GoogleToolDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

interface CacheEntry {
  /** Google resource name, e.g. `cachedContents/abc123` */
  name: string;
  /** ISO timestamp when the cache expires (from the API response) */
  expireTime: string;
  /** Hash of the content that was cached — if the prompt changes, invalidate */
  contentHash: string;
}

interface CachedContentResponse {
  name: string;
  model: string;
  displayName: string;
  usageMetadata: { totalTokenCount: number };
  createTime: string;
  updateTime: string;
  expireTime: string;
}

// ── Simple FNV-1a hash (deterministic, fast, no crypto deps) ──────────────────

function fnv1aHash(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.codePointAt(i) ?? 0;
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

// ── Service ───────────────────────────────────────────────────────────────────

const CACHE_TTL_SECONDS = 30 * 60; // 30 minutes
const CACHE_REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh 5 min before expiry
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export class ContextCacheService {
  /** In-memory cache: agentId → CacheEntry */
  private readonly entries = new Map<string, CacheEntry>();

  /**
   * Get an existing cached content resource or create a new one.
   * Returns the cache resource name for use in providerOptions, or null
   * if caching is unavailable (missing API key, prompt too short, etc.).
   */
  async getOrCreate(
    agentId: string,
    modelId: string,
    systemPrompt: string,
    toolDeclarations?: GoogleToolDeclaration[],
  ): Promise<string | null> {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) return null;

    const toolsKey = toolDeclarations?.length
      ? JSON.stringify(toolDeclarations.map((t) => t.name).sort())
      : "";
    const contentHash = fnv1aHash(systemPrompt + modelId + toolsKey);
    const existing = this.entries.get(agentId);

    // Return existing cache if it's still valid and the content hasn't changed
    if (existing?.contentHash === contentHash) {
      const expiresAt = new Date(existing.expireTime).getTime();
      const now = Date.now();
      if (now < expiresAt - CACHE_REFRESH_BUFFER_MS) {
        return existing.name;
      }
      // Close to expiry — delete and recreate below
      this.entries.delete(agentId);
    }

    // Content changed — old cache is stale
    if (existing && existing.contentHash !== contentHash) {
      this.entries.delete(agentId);
    }

    // Create a new cached content resource
    try {
      const result = await this.createCache(
        apiKey,
        agentId,
        modelId,
        systemPrompt,
        toolDeclarations,
      );
      if (!result) return null;

      this.entries.set(agentId, {
        name: result.name,
        expireTime: result.expireTime,
        contentHash,
      });

      console.log(
        `[ContextCache] Created cache for ${agentId}: ${result.name} ` +
          `(${result.usageMetadata.totalTokenCount} tokens, expires ${result.expireTime})`,
      );

      return result.name;
    } catch (err) {
      console.warn(
        `[ContextCache] Failed to create cache for ${agentId}:`,
        err,
      );
      return null;
    }
  }

  private async createCache(
    apiKey: string,
    agentId: string,
    modelId: string,
    systemPrompt: string,
    toolDeclarations?: GoogleToolDeclaration[],
  ): Promise<CachedContentResponse | null> {
    // Google model format: models/{modelId}
    const googleModel = modelId.startsWith("models/")
      ? modelId
      : `models/${modelId}`;

    const expireTime = new Date(
      Date.now() + CACHE_TTL_SECONDS * 1000,
    ).toISOString();

    const body: Record<string, unknown> = {
      model: googleModel,
      displayName: `careai-${agentId}`,
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      expireTime,
    };

    // Include tool declarations so GenerateContent doesn't need to send
    // tools/toolConfig (Google rejects those alongside cachedContent).
    if (toolDeclarations?.length) {
      body.tools = [
        {
          functionDeclarations: toolDeclarations,
        },
      ];
      body.toolConfig = {
        functionCallingConfig: { mode: "AUTO" },
      };
    }

    const res = await fetch(`${API_BASE}/cachedContents?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      // 400 with "too few tokens" means the prompt is below the minimum
      // threshold — this is expected for short prompts, not an error.
      if (res.status === 400 && errorBody.includes("too few tokens")) {
        console.log(
          `[ContextCache] Prompt for ${agentId} is below minimum token threshold, skipping cache`,
        );
        return null;
      }
      console.warn(
        `[ContextCache] API error ${res.status}:`,
        errorBody.slice(0, 300),
      );
      return null;
    }

    return (await res.json()) as CachedContentResponse;
  }

  /** Remove a specific agent's cache entry from memory. */
  invalidate(agentId: string): void {
    this.entries.delete(agentId);
  }

  /** Clear all in-memory cache entries. */
  clear(): void {
    this.entries.clear();
  }
}

/** Singleton — import this throughout the server-side application. */
export const contextCacheService = new ContextCacheService();
