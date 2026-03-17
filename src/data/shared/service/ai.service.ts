// AI Service — server-only. Never import in client components.
import { google, GoogleLanguageModelOptions } from "@ai-sdk/google";
import {
  generateText,
  streamText,
  Output,
  stepCountIs,
  wrapLanguageModel,
  smoothStream,
} from "ai";
import type {
  LanguageModel,
  LanguageModelMiddleware,
  ModelMessage,
  ToolSet,
} from "ai";
import type { z } from "zod";
import { UsageService } from "@/data/usage/service/lazy-reset-usage.service";
import { UsageRepository } from "@/data/usage/repositories/usage.repository";
import { CreditsExhaustedError } from "@/lib/errors";
import { ragContextBuilder } from "./rag/rag-context-builder.service";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Token usage returned by AI SDK */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** RAG context options for AI service */
export interface RAGOptions {
  /** Profile ID for RAG search */
  profileId: string;
  /** Optional dependent ID for RAG search */
  dependentId?: string;
  /** User query for semantic RAG search */
  userQuery: string;
  /** Enable/disable RAG (default: true) */
  enabled?: boolean;
  /** Max chunks to retrieve in initial search (default: 30 with reranking, 10 without) */
  limit?: number;
  /** Minimum similarity score for initial search (default: 0.4) */
  minScore?: number;
  /** Enable LLM-based reranking for better relevance (default: true) */
  rerank?: boolean;
  /** Number of results to return after reranking (default: 10) */
  rerankTopK?: number;
  /** Minimum rerank score threshold 0-1 for AWS Bedrock (default: 0.5) */
  rerankMinScore?: number;
  /** Minimum score as a ratio of the top result's score (0-1) */
  rerankMinScoreRatio?: number;
}

/**
 * Central AI service — owns model instances, streaming, and structured
 * extraction (with automatic credit gating).
 *
 * All paths to the LLM are credit-gated:
 * - `stream()` and `extractObject()` check credits before calling the model.
 * - `forUser(userId)` returns wrapped models for direct `generateText` /
 *   `generateObject` calls — the middleware throws `CreditsExhaustedError`
 *   when the daily limit is reached so API routes can return a 402.
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

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async fetchRagContext(
    userId: string,
    ragOptions: RAGOptions,
  ): Promise<string> {
    const ragStart = performance.now();
    const rerank = ragOptions.rerank ?? true;
    console.log(
      `[AIService] RAG enabled (reranking: ${rerank}), fetching context...`,
    );

    try {
      const ragResult = await Promise.race([
        ragContextBuilder.buildContext({
          userId,
          profileId: ragOptions.profileId,
          dependentId: ragOptions.dependentId,
          query: ragOptions.userQuery,
          limit: ragOptions.limit,
          minScore: ragOptions.minScore,
          rerank: ragOptions.rerank,
          rerankTopK: ragOptions.rerankTopK,
          rerankMinScore: ragOptions.rerankMinScore,
          rerankMinScoreRatio: ragOptions.rerankMinScoreRatio,
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);

      if (!ragResult) {
        console.warn(
          "[AIService] RAG timed out (3s), continuing without context",
        );
        return "";
      }
      console.log(
        `[AIService] RAG context retrieved: ${ragResult.count} chunks, ${(performance.now() - ragStart).toFixed(0)}ms`,
      );
      return ragResult.context;
    } catch (err) {
      console.error("[AIService] RAG failed:", err);
      return "";
    }
  }

  private buildSystemMessages(
    opts: {
      cachedSystemPrompt?: string;
      dynamicSystemPrompt?: string;
      system?: string;
    },
    ragContext: string,
  ):
    | Array<{
        role: "system";
        content: string;
        experimental_cacheControl?: { type: "ephemeral" };
      }>
    | string
    | undefined {
    if (!opts.cachedSystemPrompt && !opts.dynamicSystemPrompt && !ragContext) {
      return opts.system;
    }

    const messages: Array<{
      role: "system";
      content: string;
      experimental_cacheControl?: { type: "ephemeral" };
    }> = [];

    if (opts.cachedSystemPrompt) {
      messages.push({
        role: "system",
        content: opts.cachedSystemPrompt,
        experimental_cacheControl: { type: "ephemeral" },
      });
      console.log(
        "[AIService] Using cached system prompt:",
        opts.cachedSystemPrompt.length,
        "chars",
      );
    }

    const combinedDynamic = [opts.dynamicSystemPrompt, ragContext]
      .filter(Boolean)
      .join("\n\n");
    if (combinedDynamic) {
      messages.push({ role: "system", content: combinedDynamic });
      console.log(
        "[AIService] Dynamic prompt:",
        combinedDynamic.length,
        "chars",
        ragContext
          ? `(includes ${ragContext.split("\n").length} lines of RAG context)`
          : "",
      );
    }

    return messages;
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /*
   * RAG Integration:
   * - When `ragOptions` is provided, automatically fetches semantic context
   * - RAG context is injected into the dynamic system prompt
   * - Gracefully handles RAG failures with 3s timeout
   */
  async stream<TOOLS extends ToolSet = ToolSet>(
    options: {
      userId: string;
      model?: LanguageModel;
      // For backward compatibility
      system?: string;
      // NEW: For context caching
      cachedSystemPrompt?: string;
      dynamicSystemPrompt?: string;
      /** RAG options for semantic context retrieval */
      ragOptions?: RAGOptions;
      /** Forward request AbortSignal so client disconnect cancels the stream */
      abortSignal?: AbortSignal;
    } & Omit<
      Parameters<typeof streamText<TOOLS>>[0],
      "model" | "system" | "abortSignal"
    >,
  ) {
    const ragContext =
      options.ragOptions && options.ragOptions.enabled !== false
        ? await this.fetchRagContext(options.userId, options.ragOptions)
        : "";

    const systemMessages = this.buildSystemMessages(options, ragContext);

    // Credit check — usage-based system
    const usage = await this.usageService.getUsage(options.userId);
    if (usage.credits <= 0) throw new CreditsExhaustedError(0);
    await this.usageService.updateUsage(options.userId, {
      credits: usage.credits - 1,
    });

    // Only apply high-level thinking to the pro (chat) model.
    // Flash is used for onboarding where speed matters over reasoning depth.
    const resolvedModel = options.model ?? this._chat;
    const isProModel = resolvedModel === this._chat;

    // Stream with AI SDK — maxSteps enables server-side tool loop so the model
    // can chain multiple tool calls (reason → call → result → reason → ...) in
    // a single HTTP request, eliminating client round-trips between steps.
    return streamText<TOOLS>({
      ...(options as Parameters<typeof streamText<TOOLS>>[0]),
      model: resolvedModel,
      system: systemMessages,
      stopWhen: stepCountIs(10),
      abortSignal: options.abortSignal,
      experimental_transform: smoothStream(),
      onError({ error }) {
        console.error("[AIService] Stream error:", error);
      },
      providerOptions: isProModel
        ? {
            google: {
              thinkingConfig: {
                thinkingLevel: "high",
                includeThoughts: true,
              },
            } satisfies GoogleLanguageModelOptions,
          }
        : undefined,
    });
  }

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
