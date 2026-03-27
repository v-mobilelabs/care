// AI Service — server-only. Never import in client components.
import { generateText, Output, wrapLanguageModel } from "ai";
import type { LanguageModel, LanguageModelMiddleware, ModelMessage } from "ai";
import type { z } from "zod";
import { UsageService } from "@/data/usage/service/lazy-reset-usage.service";
import { UsageRepository } from "@/data/usage/repositories/usage.repository";
import { CreditsExhaustedError } from "@/lib/errors";
import { sharedModels } from "@/data/shared/service/model";

// ── Retry helpers ─────────────────────────────────────────────────────────────

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

function getErrorStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const source = error as Record<string, unknown>;
  const candidates = [
    source.status,
    source.statusCode,
    source.code,
    source.httpStatus,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "number") return candidate;
    if (typeof candidate === "string") {
      const parsed = Number(candidate);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return undefined;
}

function getErrorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (!error || typeof error !== "object") return "";
  const source = error as Record<string, unknown>;
  const message = source.message;
  if (typeof message === "string") return message;
  return JSON.stringify(source);
}

function isRetryableTransientError(error: unknown): boolean {
  const statusCode = getErrorStatusCode(error);
  if (statusCode !== undefined && RETRYABLE_STATUS_CODES.has(statusCode)) {
    return true;
  }
  const text = getErrorText(error).toLowerCase();
  if (text.length === 0) return false;
  return [
    "resource exhausted",
    "resource_exhausted",
    "too many requests",
    "quota exceeded",
    "rate limit",
    "unavailable",
    "deadline exceeded",
    "temporarily overloaded",
  ].some((needle) => text.includes(needle));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function backoffDelayMs(attemptIndex: number): number {
  // Truncated exponential backoff with jitter:
  // 1st retry ~400-700ms, 2nd retry ~900-1300ms
  const base = Math.min(400 * Math.pow(2, attemptIndex), 1_000);
  const jitter = Math.floor(Math.random() * 300);
  return base + jitter;
}

async function runWithTransientRetry<T>(
  action: () => PromiseLike<T>,
  opts?: { maxRetries?: number },
): Promise<T> {
  const maxRetries = opts?.maxRetries ?? 2;

  for (let attempt = 0; ; attempt++) {
    try {
      return await action();
    } catch (error) {
      if (attempt >= maxRetries || !isRetryableTransientError(error)) {
        throw error;
      }
      await sleep(backoffDelayMs(attempt));
    }
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

/** Token usage returned by AI SDK */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Central AI service — owns model instances, structured extraction,
 * and credit-gated model wrappers.
 *
 * All paths to the LLM are credit-gated:
 * - `extractObject()` / `extractChoice()` check credits before calling the model.
 * - `forUser(userId)` returns wrapped models for direct `generateText` /
 *   `generateObject` calls — the middleware throws `CreditsExhaustedError`
 *   when the monthly limit is reached so API routes can return a 402.
 *
 * Streaming chat is handled by `createAgent()` + `createAgentUIStreamResponse()`
 * in the agent layer — not by this service.
 *
 * Usage:
 * ```ts
 * // Credit-gated structured extraction:
 * const data = await aiService.extractObject(MySchema, messages, { userId });
 *
 * // Direct model use (e.g. with Google Search grounding) — must use forUser():
 * const { chat, fast } = aiService.forUser(userId);
 * const { text } = await generateText({ model: fast, ... });
 * ```
 */
export class AIService {
  /** @internal Raw pro model — use forUser().chat for credit-gated access. */
  private readonly _chat = sharedModels.pro;

  /** @internal Raw flash model — use forUser().fast for credit-gated access. */
  private readonly _fast = sharedModels.fast;

  /** @internal Lite model for ultra-fast classification tasks (gateway routing). */
  private readonly _lite = sharedModels.lite;

  private readonly usageService = new UsageService(new UsageRepository());

  /**
   * Returns credit-gated model instances bound to `userId`.
   * Every call to `.chat` or `.fast` consumes one credit and throws
   * `CreditsExhaustedError` if the daily limit is reached.
   *
   * Use these for direct `generateText` / `generateObject` calls anywhere
   * in the codebase that doesn't go through `stream()` or `extractObject()`.
   */
  forUser(userId: string): { chat: LanguageModel; fast: LanguageModel } {
    const gate = async () => {
      const remaining = await this.usageService.consumeCredit(userId);
      if (remaining < 0) throw new CreditsExhaustedError(0);
    };
    const creditMiddleware: LanguageModelMiddleware = {
      specificationVersion: "v3",
      wrapGenerate: async ({ doGenerate }) => {
        await gate();
        return runWithTransientRetry(() => doGenerate());
      },
      wrapStream: async ({ doStream }) => {
        await gate();
        return runWithTransientRetry(() => doStream());
      },
    };
    const wrap = (base: typeof this._chat) =>
      wrapLanguageModel({ model: base, middleware: creditMiddleware });
    return { chat: wrap(this._chat), fast: wrap(this._fast) };
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * Extract a typed object from a conversation using structured output.
   * Consumes one credit for `userId` before calling the model.
   * Throws `CreditsExhaustedError` if the daily limit is reached.
   *
   * @param schema  - Zod schema describing the expected output shape.
   * @param messages - Model messages (can include image / file parts).
   * @param opts.userId - Required for credit accounting.
   * @param opts.model  - Override the default `chat` model.
   */
  async extractObject<T extends z.ZodTypeAny>(
    schema: T,
    messages: ModelMessage[],
    opts: {
      userId: string;
      /** Use the fast (Flash) model instead of the default pro model. */
      useFast?: boolean;
      /** Use the lite model for ultra-fast classification. */
      useLite?: boolean;
      /** Skip credit consumption (e.g. gateway routing is free). */
      skipCredit?: boolean;
    },
  ): Promise<z.infer<T>> {
    // 1. Credit check (skippable for meta-operations like gateway routing)
    if (!opts.skipCredit) {
      const remaining = await this.usageService.consumeCredit(opts.userId);
      if (remaining < 0) {
        throw new CreditsExhaustedError(0);
      }
    }

    // 2. Run extraction (credit already consumed when needed)
    let model;
    if (opts.useLite) model = this._lite;
    else model = opts.useFast ? this._fast : this._chat;

    const result = await runWithTransientRetry(() =>
      generateText({
        model,
        output: Output.object({ schema }),
        messages,
        temperature: 0,
        maxRetries: 0,
      }),
    );

    // Cast required: TS cannot infer the output shape from a generic schema param.
    const object = (result as unknown as { output?: z.infer<T> }).output;
    if (object === undefined || object === null) {
      throw new Error(
        "Model returned no structured output — the response may have been empty or malformed.",
      );
    }
    return object;
  }

  /**
   * Classify a prompt into one of a fixed set of string options.
   * Uses `Output.choice()` — simpler and faster than `extractObject()` for
   * routing / classification tasks.
   *
   * @param options  - Array of allowed string values.
   * @param messages - Model messages for classification.
   * @param opts     - userId, model tier, and credit options.
   */
  async extractChoice<T extends string>(
    options: readonly T[],
    messages: ModelMessage[],
    opts: {
      userId: string;
      useFast?: boolean;
      useLite?: boolean;
      skipCredit?: boolean;
    },
  ): Promise<T> {
    if (!opts.skipCredit) {
      const remaining = await this.usageService.consumeCredit(opts.userId);
      if (remaining < 0) throw new CreditsExhaustedError(0);
    }

    let model;
    if (opts.useLite) model = this._lite;
    else model = opts.useFast ? this._fast : this._chat;

    const result = await runWithTransientRetry(() =>
      generateText({
        model,
        output: Output.choice({ options: options as unknown as string[] }),
        messages,
        temperature: 0,
        maxOutputTokens: 256,
        maxRetries: 0,
      }),
    );

    const choice = (result as unknown as { output?: T }).output;
    if (choice === undefined || choice === null) {
      throw new Error(
        "Model returned no choice — the response may have been empty or malformed.",
      );
    }
    return choice;
  }
}

/** Singleton — import this throughout the server-side application. */
export const aiService = new AIService();
