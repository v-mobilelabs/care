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
 *      via preflight + gateway orchestration and injected by `preContextMiddleware`)
 *  4. Wraps the model with the middleware chain
 *  5. Delegates to a fresh ToolLoopAgent for the actual LLM streaming loop
 */

import { type VertexLanguageModelOptions } from "@/data/shared/service/vertex-provider";
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
import { cachedContentMiddleware } from "@/data/shared/service/middleware/cached-content.middleware";
import { preContextMiddleware } from "@/data/shared/service/middleware/pre-context.middleware";
import type { PreRunContext } from "@/data/shared/service/middleware/pre-run";
import { actionCard } from "@/data/shared/service/agents/base/tools/action-card.tool";
import { createMemoryTool } from "@/data/shared/service/agents/base/tools/memory.tool";
import { submitReportTool } from "@/data/shared/service/agents/base/tools/submit-report.tool";
import { submitReferralRequestTool } from "@/data/shared/service/agents/base/tools/submit-referral-request.tool";
import { createGetPatientProfileTool } from "@/data/shared/service/agents/global-tools/get-patient-profile.tool";
import { createGetMedicationsTool } from "@/data/shared/service/agents/global-tools/get-medications.tool";
import { createSearchPatientRecordsTool } from "@/data/shared/service/agents/global-tools/search-patient-records.tool";
import { createFetchLabReportsTool } from "@/data/shared/service/agents/global-tools/fetch-lab-reports.tool";
import { createFetchPrescriptionsTool } from "@/data/shared/service/agents/global-tools/fetch-prescriptions.tool";
import { createLogVitalTool } from "@/data/shared/service/agents/global-tools/log-vital.tool";
import { createSubmitLabReportAnalysisTool } from "@/data/shared/service/agents/global-tools/submit-lab-report-analysis.tool";
import { createSubmitPrescriptionTool } from "@/data/shared/service/agents/global-tools/submit-prescription.tool";
import {
  createAgentExecutionGraph,
  runAgentExecutionGraph,
  type AgentExecutionOptions,
  type AgentThinkingLevel,
} from "@/workflow/agent-execution.workflow";
import { modelIds, sharedModels } from "@/data/shared/service/model";
import type { ProfileDto } from "@/data/profile";

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

// ── Public types ──────────────────────────────────────────────────────────────

/**
 * Per-request options passed to every agent via createAgentUIStreamResponse
 * or direct agent.stream() calls.
 */
export interface AgentCallOptions {
  /** The authenticated user's UID */
  userId: string;
  /** Response style selected by user in assistant UI. */
  responseMode?: "quick" | "full";
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
  /** Pre-fetched profile reused across gateway + agent runtime. */
  profile?: ProfileDto | null;
  /** Thinking depth for the LLM — set by gateway based on query complexity */
  thinkingLevel?: AgentThinkingLevel;
  /** Whether this query needs patient medical records (RAG). When false, the
   *  expensive KNN + Bedrock reranking pipeline is skipped entirely. */
  needsRag?: boolean;
  /** Pre-fetched context assembled in PrepareChatUseCase. When provided, the agent
   *  skips guardrail/credit/memory/rag middleware and uses a lightweight
   *  injector instead. */
  preContext?: PreRunContext;
  /** Agent's assessment configuration (if assessment-based agent). */
  assessmentConfig?: {
    adaptiveMode?: boolean;
  };
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
  /** Configuration for adaptive assessment questions. When enabled, questions are
   *  validated via lightweight LLM at startAssessment time. */
  assessmentConfig?: {
    /** Enable adaptive question validation and skeletal structure. */
    adaptiveMode?: boolean;
  };
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

type AgentEventCallback = (event: Record<string, unknown>) => void;

function getAgentEventCallback(
  params: AgentStreamParameters<AgentCallOptions, ToolSet>,
  key: "onStepFinish" | "onFinish",
): AgentEventCallback | undefined {
  if (!(key in params)) return undefined;
  return (params as Record<string, unknown>)[key] as
    | AgentEventCallback
    | undefined;
}

function getAgentMessages(
  params: AgentStreamParameters<AgentCallOptions, ToolSet>,
): ModelMessage[] {
  if ("prompt" in params && Array.isArray(params.prompt)) {
    return params.prompt;
  }

  if ("messages" in params && params.messages) {
    return params.messages;
  }

  return [];
}

function getRequiredAgentOptions(
  id: string,
  params: AgentStreamParameters<AgentCallOptions, ToolSet>,
): AgentCallOptions {
  const options = "options" in params ? params.options : undefined;

  if (!options) {
    throw new Error(
      `[${id}] stream() requires options: AgentCallOptions (userId, profileId, userQuery, sessionId).`,
    );
  }

  return options;
}

function buildVertexOptions(args: {
  thinkingLevel?: AgentThinkingLevel;
  cacheName: string | null;
}): VertexLanguageModelOptions {
  const vertexThinkingLevel =
    args.thinkingLevel === "low" ||
    args.thinkingLevel === "medium" ||
    args.thinkingLevel === "high"
      ? args.thinkingLevel
      : undefined;

  return {
    ...(vertexThinkingLevel && {
      thinkingConfig: {
        thinkingLevel: vertexThinkingLevel,
        includeThoughts: true,
      },
    }),
    ...(args.cacheName && { cachedContent: args.cacheName }),
  };
}

function buildAgentMiddleware(args: {
  agentId: string;
  preContext?: PreRunContext;
  dynamicContext: string;
  cacheName: string | null;
}): LanguageModelMiddleware[] {
  const commonMiddleware: LanguageModelMiddleware[] = [
    ...(args.cacheName ? [cachedContentMiddleware] : []),
    addToolInputExamplesMiddleware(),
    ...(process.env.NODE_ENV === "development" ? [devToolsMiddleware()] : []),
  ];

  if (!args.preContext) {
    throw new Error(
      `[${args.agentId}] preContext is required — PrepareChatUseCase must run preflight + gateway orchestration before streaming.`,
    );
  }

  return [
    preContextMiddleware({
      agentId: args.agentId,
      preContext: args.preContext,
      dynamicContext: args.dynamicContext || undefined,
      cacheActive: !!args.cacheName,
    }),
    ...commonMiddleware,
  ];
}

function buildAgentInstructions(args: {
  cacheName: string | null;
  staticPrompt: string;
}): SystemModelMessage[] | undefined {
  return args.cacheName
    ? undefined
    : [{ role: "system", content: args.staticPrompt }];
}

function compactSystemPrompt(prompt: string): string {
  return prompt
    .replaceAll(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replaceAll(/\n{3,}/g, "\n\n")
    .trim();
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
// eslint-disable-next-line max-lines-per-function
export function createAgent(
  config: AgentConfig,
): Agent<AgentCallOptions, ToolSet> {
  const staticPrompt = compactSystemPrompt(config.buildSystemPrompt());

  const {
    id,
    buildTools,
    buildDynamicContext,
    assessmentConfig,
    model = sharedModels.pro,
    modelId = modelIds.pro,
    fastModel = sharedModels.fast,
    fastModelId = modelIds.fast,
    useThinking = true,
    maxSteps = 10,
    temperature,
    maxOutputTokens = 65536,
    allowActionCard = true,
  } = config;

  const executionGraph = createAgentExecutionGraph({
    id,
    staticPrompt,
    buildTools: (options) => buildTools(options as AgentCallOptions),
    buildDynamicContext: buildDynamicContext
      ? async (options) => buildDynamicContext(options as AgentCallOptions)
      : undefined,
    assessmentConfig,
    modelId,
    fastModelId,
    useThinking,
    allowActionCard,
  });

  const agent: Agent<AgentCallOptions, ToolSet> = {
    version: "agent-v1",
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
        assessmentConfig,
      } as AgentCallOptions),
      memory: createMemoryTool("", "", ""),
      getPatientProfile: createGetPatientProfileTool(""),
      getMedications: createGetMedicationsTool(""),
      searchPatientRecords: createSearchPatientRecordsTool("", ""),
      fetchLabReports: createFetchLabReportsTool("", ""),
      fetchPrescriptions: createFetchPrescriptionsTool("", ""),
      logVital: createLogVitalTool(""),
      submitLabReportAnalysis: createSubmitLabReportAnalysisTool(),
      submitPrescription: createSubmitPrescriptionTool("", ""),
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
      const outerOnStepFinish = getAgentEventCallback(params, "onStepFinish");
      const outerOnFinish = getAgentEventCallback(params, "onFinish");
      const messages = getAgentMessages(params);
      const options = getRequiredAgentOptions(id, params);

      console.log(
        `[${id}] Starting stream for user ${options.userId}, query: "${options.userQuery.slice(0, 80)}${options.userQuery.length > 80 ? "…" : ""}"`,
      );

      const executionState = await runAgentExecutionGraph({
        graph: executionGraph,
        options: options as AgentExecutionOptions,
        messages,
      });

      console.log(
        `[${id}] LangGraph runtime: ${executionState.trace.join(" → ")}`,
      );

      const activeModel = executionState.useFast ? fastModel : model;
      const vertexOptions = buildVertexOptions({
        thinkingLevel: executionState.thinkingLevel,
        cacheName: executionState.cacheName,
      });
      const middleware = buildAgentMiddleware({
        agentId: id,
        preContext: options.preContext,
        dynamicContext: executionState.dynamicContext,
        cacheName: executionState.cacheName,
      });

      const wrappedModel = wrapLanguageModel({
        model: activeModel as Parameters<typeof wrapLanguageModel>[0]["model"],
        middleware,
      });
      // ── 5. Instructions ─────────────────────────────────────────────
      // When cache is active, static prompt is in cache — omit instructions.
      // Dynamic context + RAG are injected by ragMiddleware as synthetic turns.
      const instructions = buildAgentInstructions({
        cacheName: executionState.cacheName,
        staticPrompt: executionState.staticPrompt,
      });

      // ── 6. Delegate to ToolLoopAgent ────────────────────────────────
      return new ToolLoopAgent({
        model: wrappedModel,
        instructions,
        tools: executionState.tools,
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
