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
 *       preContextMiddleware → cachedContentMiddleware → toolInputExamples
 *     (guardrail, credit, memory, and RAG are pre-fetched in PrepareChatUseCase
 *      via `prefetchContext()` and injected by `preContextMiddleware`)
 *  4. Wraps the model with the middleware chain
 *  5. Delegates to a fresh ToolLoopAgent for the actual LLM streaming loop
 */

import {
  google,
  type VertexLanguageModelOptions,
} from "@/data/shared/service/vertex-provider";
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
  ModelMessage,
  StreamTextResult,
  SystemModelMessage,
  ToolSet,
  LanguageModel,
} from "ai";
import { devToolsMiddleware } from "@ai-sdk/devtools";
import {
  cachedContentMiddleware,
  getContextCache,
} from "@/data/shared/service/middleware/cached-content.middleware";
import { preContextMiddleware } from "@/data/shared/service/middleware/pre-context.middleware";
import type { PreRunContext } from "@/data/shared/service/middleware/pre-run";
import { actionCard } from "@/data/shared/service/agents/base/tools/action-card.tool";
import { createMemoryTool } from "@/data/shared/service/agents/base/tools/memory.tool";
import { submitReportTool } from "@/data/shared/service/agents/base/tools/submit-report.tool";
import { submitReferralRequestTool } from "@/data/shared/service/agents/base/tools/submit-referral-request.tool";
import { GetProfileUseCase, type ProfileDto } from "@/data/profile";

// ── Prune helper ──────────────────────────────────────────────────────────────

type AssistantParts = Exclude<
  Extract<ModelMessage, { role: "assistant" }>["content"],
  string
>;

/** Find the original message whose tool-call IDs match the pruned parts. */
function findOriginalWithReasoning(
  parts: AssistantParts,
  originals: ModelMessage[],
): AssistantParts | null {
  for (const o of originals) {
    if (o.role !== "assistant" || typeof o.content === "string") continue;
    const hasReasoning = o.content.some((p) => p.type === "reasoning");
    const sharesToolCall = o.content.some(
      (p) =>
        p.type === "tool-call" &&
        parts.some(
          (mp) => mp.type === "tool-call" && mp.toolCallId === p.toolCallId,
        ),
    );
    if (hasReasoning && sharesToolCall) return o.content;
  }
  return null;
}

/** Restore reasoning parts stripped from an assistant tool-call message. */
function restoreToolCallReasoning(
  pruned: ModelMessage,
  originals: ModelMessage[],
): ModelMessage {
  if (pruned.role !== "assistant" || typeof pruned.content === "string")
    return pruned;
  const parts = pruned.content;
  if (parts.some((p) => p.type === "reasoning")) return pruned;
  if (!parts.some((p) => p.type === "tool-call")) return pruned;
  const origContent = findOriginalWithReasoning(parts, originals);
  if (!origContent) return pruned;
  const reasoning = origContent.filter((p) => p.type === "reasoning");
  return reasoning.length > 0
    ? { ...pruned, content: [...reasoning, ...parts] }
    : pruned;
}

/**
 * Prune reasoning from prior messages, but keep reasoning paired with tool
 * calls — Gemini links thought + functionCall via thoughtSignature and rejects
 * orphaned signatures.
 */
function pruneKeepingToolCallReasoning(
  messages: ModelMessage[],
): ModelMessage[] {
  return pruneMessages({ messages, reasoning: "before-last-message" }).map(
    (m) => restoreToolCallReasoning(m, messages),
  );
}

// ── Profile context builder ───────────────────────────────────────────────────

function buildProfileContext(profile: ProfileDto): string {
  const age = profile.dateOfBirth
    ? Math.floor(
        (Date.now() - new Date(profile.dateOfBirth).getTime()) / 31_557_600_000,
      )
    : undefined;
  const lines = [
    `- ID: ${profile.userId}`,
    `- Kind: ${profile.kind}`,
    profile.name && `- Name: ${profile.name}`,
    profile.gender && `- Gender: ${profile.gender}`,
    profile.city && `- City: ${profile.city}`,
    profile.country && `- Country: ${profile.country}`,
    profile.dateOfBirth &&
      `- Date of Birth: ${profile.dateOfBirth}${age !== undefined ? ` (Age: ${age})` : ""}`,
  ].filter(Boolean);
  return `## Patient Profile\n${lines.join("\n")}`;
}

// ── Public types ──────────────────────────────────────────────────────────────

/**
 * Per-request options passed to every agent via createAgentUIStreamResponse
 * or direct agent.stream() calls.
 */
export interface AgentCallOptions {
  /** The authenticated user's UID */
  userId: string;
  /** Active profile ID (self profile in patient portal) */
  profileId: string;
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
  /** Pre-fetched context from prefetchContext(). When provided, the agent
   *  skips guardrail/credit/memory/rag middleware and uses a lightweight
   *  injector instead. */
  preContext?: PreRunContext;
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
  /** Fast LLM model for low-thinking queries. Default: gemini-3.1-flash-lite-preview. */
  fastModel?: LanguageModel;
  /** Fast model ID for context cache key. Default: "gemini-3.1-flash-lite-preview". */
  fastModelId?: string;
  /** Whether to enable thinking mode. Default: true. */
  useThinking?: boolean;
  /** Maximum tool-loop iterations. Default: 10. */
  maxSteps?: number;
  /** Sampling temperature. Lower = more deterministic. Default: provider default (~1.0). */
  temperature?: number;
  /** Maximum output tokens per LLM call. Default: 65536. */
  maxOutputTokens?: number;
  /** Whether to inject global actionCard tool. Default: true. */
  allowActionCard?: boolean;
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
    fastModel = google("gemini-3.1-flash-lite-preview"),
    fastModelId = "gemini-3.1-flash-lite-preview",
    useThinking = true,
    maxSteps = 10,
    temperature,
    maxOutputTokens = 65536,
    allowActionCard = true,
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
      ...(allowActionCard ? { actionCard } : {}),
      submitReport: submitReportTool,
      submitReferralRequest: submitReferralRequestTool,
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

      // ── 1. Build per-request tools + fetch profile ─────────────────
      const [tools, profile] = await Promise.all([
        Promise.resolve({
          ...buildTools(options),
          memory: createMemoryTool(
            options.userId,
            options.profileId,
            options.sessionId,
          ),
          ...(allowActionCard ? { actionCard } : {}),
          submitReport: submitReportTool,
          submitReferralRequest: submitReferralRequestTool,
        } as ToolSet),
        new GetProfileUseCase()
          .execute({ userId: options.profileId })
          .catch(() => null),
      ]);

      const staticPrompt = buildSystemPrompt();
      const agentDynamicContext = (await buildDynamicContext?.(options)) ?? "";
      const profileContext = profile ? buildProfileContext(profile) : "";
      const dynamicContext = [profileContext, agentDynamicContext]
        .filter(Boolean)
        .join("\n\n");

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

      const vertexThinkingLevel =
        thinkingLevel === "low" ||
        thinkingLevel === "medium" ||
        thinkingLevel === "high"
          ? thinkingLevel
          : undefined;

      const vertexOptions: VertexLanguageModelOptions = {
        ...(vertexThinkingLevel && {
          thinkingConfig: { thinkingLevel: vertexThinkingLevel },
        }),
        ...(cacheName && { cachedContent: cacheName }),
      };

      // ── 4. Middleware chain ─────────────────────────────────────────
      const commonMiddleware: LanguageModelMiddleware[] = [
        ...(cacheName ? [cachedContentMiddleware] : []),
        addToolInputExamplesMiddleware(),
        ...(process.env.NODE_ENV === "development"
          ? [devToolsMiddleware()]
          : []),
      ];

      const middleware: LanguageModelMiddleware[] = options.preContext
        ? [
            preContextMiddleware({
              agentId: id,
              preContext: options.preContext,
              dynamicContext: dynamicContext || undefined,
              cacheActive: !!cacheName,
            }),
            ...commonMiddleware,
          ]
        : (() => {
            throw new Error(
              `[${id}] preContext is required — PrepareChatUseCase must call prefetchContext() before streaming.`,
            );
          })();

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
        ...(temperature !== undefined && { temperature }),
        ...(maxOutputTokens !== undefined && { maxOutputTokens }),
        stopWhen: stepCountIs(maxSteps),
        providerOptions:
          Object.keys(vertexOptions).length > 0
            ? { vertex: vertexOptions }
            : undefined,
        prepareStep: ({ messages }) => ({
          messages: pruneKeepingToolCallReasoning(messages),
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
