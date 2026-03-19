/**
 * createAgent — Factory that builds an Agent<AgentCallOptions, ToolSet>
 *
 * Replaces the former AIAgentBaseClass with a functional pattern. Each
 * specialist agent calls `createAgent(config)` once at module scope to
 * produce a singleton that implements the AI SDK `Agent` interface.
 *
 * When `createAgentUIStreamResponse` (or a direct `agent.stream()` call)
 * invokes the agent, the `stream()` method:
 *
 *  1. Builds per-request tools via `config.buildTools(options)`
 *  2. Checks/creates a Google context cache for the static prompt + tools
 *  3. Composes a middleware chain:
 *       creditMiddleware → ragMiddleware → cachedContentMiddleware → toolInputExamples
 *  4. Wraps the model with the middleware chain
 *  5. Delegates to a fresh ToolLoopAgent for the actual LLM streaming loop
 *
 * Cross-cutting concerns (credit gate, RAG, caching) live in reusable
 * middleware under `src/data/shared/service/middleware/`.
 */

import { google } from "@ai-sdk/google";
import type { GoogleLanguageModelOptions } from "@ai-sdk/google";
import {
  ToolLoopAgent,
  stepCountIs,
  wrapLanguageModel,
  smoothStream,
  addToolInputExamplesMiddleware,
  pruneMessages,
} from "ai";
import type {
  Agent,
  AgentCallParameters,
  AgentStreamParameters,
  GenerateTextResult,
  LanguageModelMiddleware,
  StreamTextResult,
  SystemModelMessage,
  ToolSet,
  LanguageModel,
} from "ai";
import { devToolsMiddleware } from "@ai-sdk/devtools";
import { creditMiddleware } from "@/data/shared/service/middleware/credit.middleware";
import { guardrailMiddleware } from "@/data/shared/service/middleware/guardrail.middleware";
import { ragMiddleware } from "@/data/shared/service/middleware/rag.middleware";
import { memoryMiddleware } from "@/data/shared/service/middleware/memory.middleware";
import {
  cachedContentMiddleware,
  getContextCache,
} from "@/data/shared/service/middleware/cached-content.middleware";
import { createMemoryTool } from "@/data/shared/service/agents/base/tools/memory.tool";

// ── Public types ──────────────────────────────────────────────────────────────

/**
 * Per-request options passed to every agent via createAgentUIStreamResponse
 * or direct agent.stream() calls.
 */
export interface AgentCallOptions {
  /** The authenticated user's UID */
  userId: string;
  /** Active profile ID (primary patient or dependent) */
  profileId: string;
  /** Dependent patient ID — undefined for the primary user */
  dependentId?: string;
  /** Latest user message text — used as the semantic search query for RAG */
  userQuery: string;
  /** Current chat session ID */
  sessionId: string;
  /** Whether the user's message includes a file/image attachment */
  hasAttachment?: boolean;
  /** Pre-computed query embedding — skips the embed call inside stream() */
  queryEmbedding?: number[];
  /** Thinking depth for the LLM — set by gateway based on query complexity */
  thinkingLevel?: "low" | "medium" | "high";
  /** Whether this query needs patient medical records (RAG). When false, the
   *  expensive KNN + Bedrock reranking pipeline is skipped entirely. */
  needsRag?: boolean;
}

/** Configuration for a specialist agent. */
export interface AgentConfig {
  /** Unique agent identifier. Used in logs, headers, and context cache keys. */
  id: string;
  /** Return the agent's static system prompt. Must NOT include dynamic data. */
  buildSystemPrompt: () => string;
  /** Build per-request tools with execute functions bound to the request context. */
  buildTools: (options: AgentCallOptions) => ToolSet;
  /** Return additional per-request context (e.g. attachment note). May be async. */
  buildDynamicContext?: (options: AgentCallOptions) => string | Promise<string>;
  /** LLM model for medium/high thinking. Default: gemini-3.1-pro-preview. */
  model?: LanguageModel;
  /** Model ID string for context cache key. Default: "gemini-3.1-pro-preview". */
  modelId?: string;
  /** Fast LLM model for low-thinking queries. Default: gemini-3-flash-preview. */
  fastModel?: LanguageModel;
  /** Fast model ID for context cache key. Default: "gemini-3-flash-preview". */
  fastModelId?: string;
  /** Whether to enable thinking mode. Default: true. */

  useThinking?: boolean;
  /** Maximum tool-loop iterations. Default: 10. */
  maxSteps?: number;
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Create an Agent that implements the AI SDK Agent interface.
 *
 * Usage:
 * ```ts
 * export const clinicalAgent = createAgent({
 *   id: "clinical",
 *   buildSystemPrompt: () => buildClinicalPrompt(),
 *   buildTools: (opts) => ({ askQuestion: askQuestionTool }),
 * });
 * ```
 */
export function createAgent(
  config: AgentConfig,
): Agent<AgentCallOptions, ToolSet> {
  const {
    id,
    buildSystemPrompt,
    buildTools,
    buildDynamicContext,
    model = google("gemini-3.1-pro-preview"),
    modelId = "gemini-3.1-pro-preview",
    fastModel = google("gemini-3-flash-preview"),
    fastModelId = "gemini-3-flash-preview",
    useThinking = true,
    maxSteps = 10,
  } = config;

  const agent: Agent<AgentCallOptions, ToolSet> = {
    version: "agent-v1" as const,
    id,
    // Expose tool schemas so the SDK can validate incoming UIMessage tool parts
    // (createAgentUIStreamResponse → validateUIMessages reads agent.tools).
    // These are only used for schema validation — execute closures are rebuilt
    // per-request inside stream() with the real AgentCallOptions context.
    tools: {
      ...buildTools({
        userId: "",
        profileId: "",
        userQuery: "",
        sessionId: "",
      } as AgentCallOptions),
      memory: createMemoryTool("", "", ""),
    },

    async generate(
      _params: AgentCallParameters<AgentCallOptions, ToolSet>,
    ): Promise<GenerateTextResult<ToolSet, never>> {
      throw new Error(
        `[${id}] generate() is not supported. Use stream() for chat interactions.`,
      );
    },

    async stream(
      params: AgentStreamParameters<AgentCallOptions, ToolSet>,
    ): Promise<StreamTextResult<ToolSet, never>> {
      const { abortSignal, experimental_transform } = params;

      // Forward outer callbacks so createAgentUIStreamResponse can
      // accumulate usage / receive finish events through the agent.
      const outerOnStepFinish =
        "onStepFinish" in params
          ? ((params as Record<string, unknown>).onStepFinish as
              | ((event: Record<string, unknown>) => void)
              | undefined)
          : undefined;
      const outerOnFinish =
        "onFinish" in params
          ? ((params as Record<string, unknown>).onFinish as
              | ((event: Record<string, unknown>) => void)
              | undefined)
          : undefined;

      // Extract messages — createAgentUIStreamResponse passes `prompt`
      const messages =
        "prompt" in params && Array.isArray(params.prompt)
          ? params.prompt
          : "messages" in params && params.messages
            ? params.messages
            : [];

      const options =
        "options" in params ? (params.options as AgentCallOptions) : undefined;

      if (!options) {
        throw new Error(
          `[${id}] stream() requires options: AgentCallOptions (userId, profileId, userQuery, sessionId).`,
        );
      }

      console.log(
        `[${id}] Starting stream for user ${options.userId}, query: "${options.userQuery.slice(0, 80)}${options.userQuery.length > 80 ? "…" : ""}"`,
      );

      // ── 1. Build per-request tools ──────────────────────────────────
      const tools: ToolSet = {
        ...buildTools(options),
        memory: createMemoryTool(
          options.userId,
          options.profileId,
          options.sessionId,
        ),
      };
      const staticPrompt = buildSystemPrompt();
      const dynamicContext = (await buildDynamicContext?.(options)) ?? "";

      console.log(
        `[${id}] Instructions: static ${staticPrompt.length} chars + dynamic ${dynamicContext.length} chars | Tools: ${Object.keys(tools).join(", ")}`,
      );

      // ── 2. Select model based on thinking level ─────────────────────
      const thinkingLevel =
        options.thinkingLevel ?? (useThinking ? "high" : undefined);
      const useFast = thinkingLevel === "low";
      const activeModel = useFast ? fastModel : model;
      const activeModelId = useFast ? fastModelId : modelId;

      // ── 3. Context cache (keyed per model variant) ──────────────────
      const cacheKey = useFast ? `${id}:fast` : id;
      const cacheName = await getContextCache(
        cacheKey,
        activeModelId,
        staticPrompt,
        tools,
      );
      if (cacheName) console.log(`[${id}] Using context cache: ${cacheName}`);

      if (thinkingLevel)
        console.log(
          `[${id}] Thinking level: ${thinkingLevel}${useFast ? ` (using ${activeModelId})` : ""}`,
        );

      const googleOptions: GoogleLanguageModelOptions = {
        ...(thinkingLevel && {
          thinkingConfig: { thinkingLevel, includeThoughts: true },
        }),
        ...(cacheName && { cachedContent: cacheName }),
      };

      // ── 4. Middleware chain ─────────────────────────────────────────
      const middleware: LanguageModelMiddleware[] = [
        guardrailMiddleware({
          userId: options.userId,
          userQuery: options.userQuery,
        }),
        creditMiddleware(options.userId),
        memoryMiddleware({
          agentId: id,
          profileId: options.profileId,
          cacheActive: !!cacheName,
        }),
        ragMiddleware({
          agentId: id,
          userId: options.userId,
          profileId: options.profileId,
          dependentId: options.dependentId,
          userQuery: options.userQuery,
          needsRag: options.needsRag !== false,
          queryEmbedding: options.queryEmbedding,
          dynamicContext: dynamicContext || undefined,
          cacheActive: !!cacheName,
        }),
        ...(cacheName ? [cachedContentMiddleware] : []),
        addToolInputExamplesMiddleware(),
        ...(process.env.NODE_ENV === "development"
          ? [devToolsMiddleware()]
          : []),
      ];

      const wrappedModel = wrapLanguageModel({
        model: activeModel as Parameters<typeof wrapLanguageModel>[0]["model"],
        middleware,
      });
      // ── 5. Instructions ─────────────────────────────────────────────
      // When cache is active, static prompt is in cache — omit instructions.
      // Dynamic context + RAG are injected by ragMiddleware as synthetic turns.
      const instructions: SystemModelMessage[] | undefined = cacheName
        ? undefined
        : [{ role: "system", content: staticPrompt }];

      // ── 6. Delegate to ToolLoopAgent ────────────────────────────────
      return new ToolLoopAgent({
        model: wrappedModel,
        instructions,
        tools,
        stopWhen: stepCountIs(maxSteps),
        providerOptions:
          Object.keys(googleOptions).length > 0
            ? { google: googleOptions satisfies GoogleLanguageModelOptions }
            : undefined,
        prepareStep: ({ messages }) => ({
          messages: pruneMessages({
            messages,
            reasoning: "before-last-message",
          }),
        }),
        experimental_onToolCallStart: ({ toolCall }) => {
          console.log(`[${id}] Tool call started: ${toolCall.toolName}`);
        },
        experimental_onToolCallFinish: ({ toolCall, durationMs }) => {
          console.log(
            `[${id}] Tool call finished: ${toolCall.toolName} (${durationMs}ms)`,
          );
        },
        onStepFinish: (event) => {
          console.log(
            `[${id}] Step ${event.stepNumber} finished: ${event.finishReason}` +
              (event.usage
                ? ` (input: ${event.usage.inputTokens}, output: ${event.usage.outputTokens})`
                : ""),
          );
          outerOnStepFinish?.(event as unknown as Record<string, unknown>);
        },
        onFinish: (event) => {
          const inputTokens = event.totalUsage.inputTokens ?? 0;
          const outputTokens = event.totalUsage.outputTokens ?? 0;
          console.log(
            `[${id}] Completed: ${event.steps.length} steps, ` +
              `${inputTokens + outputTokens} total tokens`,
          );
          outerOnFinish?.(event as unknown as Record<string, unknown>);
        },
      }).stream({
        messages,
        abortSignal,
        experimental_transform: experimental_transform ?? smoothStream(),
      });
    },
  };

  return agent;
}
