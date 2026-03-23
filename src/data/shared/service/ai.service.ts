// AI Service — server-only. Never import in client components.
import { google } from "@ai-sdk/google";
import { generateText, Output, wrapLanguageModel } from "ai";
import type { LanguageModel, LanguageModelMiddleware, ModelMessage } from "ai";
import type { z } from "zod";
import { UsageService } from "@/data/usage/service/lazy-reset-usage.service";
import { UsageRepository } from "@/data/usage/repositories/usage.repository";
import { CreditsExhaustedError } from "@/lib/errors";

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
  private readonly _chat = google("gemini-3.1-pro-preview");

  /** @internal Raw fast model — use forUser().fast for credit-gated access. */
  private readonly _fast = google("gemini-3-flash-preview");

  /** @internal Lite model for ultra-fast classification tasks (gateway routing). */
  private readonly _lite = google("gemini-2.5-flash-lite");

  private readonly usageService = new UsageService(new UsageRepository());

  constructor() {}

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
      const usage = await this.usageService.getUsage(userId);
      if (usage.credits <= 0) throw new CreditsExhaustedError(0);
      await this.usageService.updateUsage(userId, {
        credits: usage.credits - 1,
      });
    };
    const creditMiddleware: LanguageModelMiddleware = {
      specificationVersion: "v3",
      wrapGenerate: async ({ doGenerate }) => {
        await gate();
        return doGenerate();
      },
      wrapStream: async ({ doStream }) => {
        await gate();
        return doStream();
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
      const usage = await this.usageService.getUsage(opts.userId);
      if (usage.credits <= 0) {
        throw new CreditsExhaustedError(0);
      }
      await this.usageService.updateUsage(opts.userId, {
        credits: usage.credits - 1,
      });
    }

    // 2. Run extraction — lite model bypasses credit-gated wrapper
    let model;
    if (opts.useLite) model = this._lite;
    else if (opts.skipCredit) model = opts.useFast ? this._fast : this._chat;
    else model = this.forUser(opts.userId)[opts.useFast ? "fast" : "chat"];

    const result = await generateText({
      model,
      output: Output.object({ schema }),
      messages,
      temperature: 0,
    });

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
      const usage = await this.usageService.getUsage(opts.userId);
      if (usage.credits <= 0) throw new CreditsExhaustedError(0);
      await this.usageService.updateUsage(opts.userId, {
        credits: usage.credits - 1,
      });
    }

    let model;
    if (opts.useLite) model = this._lite;
    else if (opts.skipCredit) model = opts.useFast ? this._fast : this._chat;
    else model = this.forUser(opts.userId)[opts.useFast ? "fast" : "chat"];

    const result = await generateText({
      model,
      output: Output.choice({ options: options as unknown as string[] }),
      messages,
      temperature: 0,
      maxOutputTokens: 256,
    });

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
