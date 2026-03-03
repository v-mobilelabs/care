// AI Service — server-only. Never import in client components.
import { google } from "@ai-sdk/google";
import { generateText, streamText, Output } from "ai";
import type { LanguageModel, ModelMessage, ToolSet } from "ai";
import type { z } from "zod";
import { ConsumeCreditUseCase } from "@/data/credits";

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * Central AI service — owns model instances, streaming, and structured
 * extraction (with automatic credit gating).
 *
 * Both `stream()` and `extractObject()` consume one credit per call.
 * If the daily limit is reached they throw `{ code: "CREDITS_EXHAUSTED" }`
 * so API routes can return a 402.
 *
 * Usage:
 * ```ts
 * // Credit-gated streaming chat:
 * const result = await aiService.stream({ userId, system, messages, tools });
 * return result.toUIMessageStreamResponse(...);
 *
 * // Credit-gated structured extraction:
 * const data = await aiService.extractObject(MySchema, messages, { userId });
 *
 * // Raw model access for one-off calls (e.g. with Google Search grounding):
 * const { text } = await generateText({ model: aiService.fast, ... });
 * ```
 */
export class AIService {
  /** Full-capability model — for chat, reasoning, and multimodal extraction. */
  readonly chat: LanguageModel = google("gemini-2.5-pro");

  /** Fast / grounding model — for quick lookups and search-grounded tasks. */
  readonly fast: LanguageModel = google("gemini-2.5-flash");

  constructor(
    private readonly consumeCredit: ConsumeCreditUseCase = new ConsumeCreditUseCase(),
  ) {}

  /**
   * Stream a text completion, defaulting to the `chat` model.
   * Consumes one credit for `userId` before the model is invoked.
   * Throws `{ code: "CREDITS_EXHAUSTED" }` if the daily limit is reached.
   *
   * The generic `TOOLS` parameter is forwarded so `toUIMessageStreamResponse`
   * retains full type information on the returned `StreamTextResult`.
   */
  async stream<TOOLS extends ToolSet = ToolSet>(
    options: { userId: string; model?: LanguageModel } & Omit<
      Parameters<typeof streamText<TOOLS>>[0],
      "model"
    >,
  ) {
    // ── Credit check ─────────────────────────────────────────────────────────
    const credit = await this.consumeCredit.execute(
      ConsumeCreditUseCase.validate({ userId: options.userId }),
    );
    if (!credit.ok) {
      throw Object.assign(new Error("Credits exhausted"), {
        code: "CREDITS_EXHAUSTED",
        remaining: credit.remaining,
      });
    }

    // ── Stream ───────────────────────────────────────────────────────────────
    return streamText<TOOLS>({
      ...(options as Parameters<typeof streamText<TOOLS>>[0]),
      model: options.model ?? this.chat,
    });
  }

  /**
   * Extract a typed object from a conversation using structured output.
   * Consumes one credit for `userId` before calling the model.
   * Throws `{ code: "CREDITS_EXHAUSTED" }` if the daily limit is reached.
   *
   * @param schema  - Zod schema describing the expected output shape.
   * @param messages - Model messages (can include image / file parts).
   * @param opts.userId - Required for credit accounting.
   * @param opts.model  - Override the default `chat` model.
   */
  async extractObject<T extends z.ZodTypeAny>(
    schema: T,
    messages: ModelMessage[],
    opts: { userId: string; model?: LanguageModel },
  ): Promise<z.infer<T>> {
    // ── 1. Credit check ───────────────────────────────────────────────────────
    const credit = await this.consumeCredit.execute(
      ConsumeCreditUseCase.validate({ userId: opts.userId }),
    );
    if (!credit.ok) {
      throw Object.assign(new Error("Credits exhausted"), {
        code: "CREDITS_EXHAUSTED",
        remaining: credit.remaining,
      });
    }

    // ── 2. Run extraction ─────────────────────────────────────────────────────
    const result = await generateText({
      model: opts.model ?? this.chat,
      output: Output.object({ schema }),
      messages,
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
}

/** Singleton — import this throughout the server-side application. */
export const aiService = new AIService();
