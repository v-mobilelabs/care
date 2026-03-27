import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import {
  consumeStream,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type ModelMessage,
} from "ai";
import { after } from "next/server";
import { revalidateTag } from "next/cache";
import {
  AddMessageUseCase,
  PrepareChatUseCase,
  SetSessionAgentUseCase,
  SetSessionGroundingUseCase,
  messageRepository,
  type PrepareChatResult,
} from "@/data/sessions";
import type { PrepareChatInput } from "@/data/sessions/use-cases/prepare-chat.use-case";
import { CreateAssessmentUseCase } from "@/data/assessments";
import { ListConditionsUseCase } from "@/data/conditions";
import { syncSymptomObservationsFromAssessment } from "@/data/symptom-observations/service/sync-from-assessment.service";
import { CacheTags } from "@/data/cached";
import {
  extractAndSaveMemories,
  extractTextFromParts,
} from "@/data/memory/service/extract-memories";
import { captureEvidenceUseCase } from "@/data/evidence";
import { EvidenceExtractor } from "@/data/shared/service/evidence-extractor";
import { CreditsExhaustedError, GuardrailError } from "@/lib/errors";
import { contextCacheService } from "@/data/shared/service/context-cache.service";
import type { PreRunContext } from "@/data/shared/service/middleware/pre-run";
import { getModelIdForThinkingLevel } from "@/data/shared/service/model";
import {
  normalizeGroundingQuery,
  shouldPersistGroundingCache,
} from "@/data/shared/service/agents/gateway/grounding-layer.service";

type AssistantModelMessage = Extract<ModelMessage, { role: "assistant" }>;

type EvidenceRagReason =
  | "attachment"
  | "record-hint"
  | "reasoning-hint"
  | "short-query-skip"
  | "long-query-default"
  | "explicit-override";

type ToolPartLike = {
  type?: string;
  state?: string;
  toolCallId?: string;
  input?: Record<string, unknown>;
  args?: Record<string, unknown>;
  output?: unknown;
};

type StartAssessmentPayload = {
  runId?: string;
  title: string;
  condition?: string;
  guideline?: string;
  estimatedQuestions?: number;
  estimatedMinutes?: string;
};

type ActionCardPayload = {
  toolCallId?: string;
  title: string;
  items: string[];
  disclaimer?: string;
};

type AskQuestionInputPayload = {
  question?: string;
  type?: string;
  options?: string[];
};

type ExtractedQaPair = {
  toolCallId?: string;
  question: string;
  questionType: string;
  options?: string[];
  answer: string;
};

type ThinkingLevel = "low" | "medium" | "high";

export type BackgroundPersistOptions = {
  thinkingLevel?: ThinkingLevel;
  preContext?: PreRunContext;
  hasAttachment?: boolean;
  responseMode?: "quick" | "full";
};

export type StreamUsageState = {
  totalInputTokens: number;
  totalOutputTokens: number;
  zeroOutputSteps: number;
};

export type PersistPayload = {
  responseParts: unknown[];
  userContent: string;
  continuationMessageId?: string;
};

export type DirectResponsePayload = {
  text: string;
  source: "known-profile-context";
  reason: string;
};

export type ChatStreamFinishPayload = {
  responseMessage: {
    parts: Array<{ type: string; text?: string }>;
  };
  finishReason?: string;
};

type ChatStreamWriter = {
  write: Parameters<
    Parameters<
      Exclude<Parameters<typeof createUIMessageStream>[0]["execute"], undefined>
    >[0]["writer"]["write"]
  >[0] extends infer T
    ? (chunk: T) => void
    : never;
};

export type ChatPreparationGraphInput = {
  userId: string;
  profileId: string;
  body: PrepareChatInput["body"];
};

export type ChatPreparationGraphOutput = {
  isUserTurn: boolean;
  preparedChat: PrepareChatResult;
  usageState: StreamUsageState;
};

export type ChatPersistenceGraphInput = {
  isUserTurn: boolean;
  userId: string;
  profileId: string;
  sessionId: string;
  agentType: string;
  ctx: { title: string; storableParts: unknown[]; userQuery: string };
  persistPayload: PersistPayload | null;
  totalInputTokens: number;
  totalOutputTokens: number;
  options: BackgroundPersistOptions;
};

type CapturedUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

type AssessmentSyncState = {
  activeRunId?: string;
  latestTitle: string;
  latestCondition?: string;
  latestGuideline?: string;
  latestEstimatedQuestions?: number;
  latestEstimatedMinutes?: string;
  latestAssessmentId?: string;
};

type ChatPreparationState = ChatPreparationGraphInput & {
  isUserTurn: boolean;
  preparedChat: PrepareChatResult | null;
  usageState: StreamUsageState;
  result: ChatPreparationGraphOutput | null;
};

type ChatPersistenceState = ChatPersistenceGraphInput & {
  capturedUsage?: CapturedUsage;
  assistantMessageId?: string;
  skipPersistence: boolean;
  result: { persisted: boolean } | null;
};

function toToolPart(part: unknown): ToolPartLike | null {
  if (!part || typeof part !== "object") return null;
  return part as ToolPartLike;
}

function getOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function getOptionalOptions(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const options = value.filter(
    (option): option is string => typeof option === "string",
  );
  return options.length > 0 ? options : undefined;
}

function normalizeStartPayload(part: ToolPartLike): StartAssessmentPayload {
  const payload = part.input ?? part.args ?? {};
  const titleValue = getOptionalString(payload.title)?.trim();
  const title =
    titleValue && titleValue.length > 0 ? titleValue : "Clinical Assessment";
  const condition = getOptionalString(payload.condition);
  const guideline = getOptionalString(payload.guideline);
  const estimatedQuestions = getOptionalNumber(payload.estimatedQuestions);
  const estimatedMinutes = getOptionalString(payload.estimatedMinutes);

  return {
    runId: part.toolCallId,
    title,
    ...(condition ? { condition } : {}),
    ...(guideline ? { guideline } : {}),
    ...(estimatedQuestions ? { estimatedQuestions } : {}),
    ...(estimatedMinutes ? { estimatedMinutes } : {}),
  };
}

function extractStarts(parts: unknown[]): StartAssessmentPayload[] {
  const starts: StartAssessmentPayload[] = [];
  for (const raw of parts) {
    const p = toToolPart(raw);
    if (p?.type !== "tool-startAssessment") continue;
    if (p.state === "input-streaming") continue;
    starts.push(normalizeStartPayload(p));
  }
  return starts;
}

function extractActionCards(parts: unknown[]): ActionCardPayload[] {
  const cards: ActionCardPayload[] = [];

  for (const raw of parts) {
    const p = toToolPart(raw);
    if (p?.type !== "tool-actionCard") continue;
    if (p.state === "input-streaming") continue;
    const payload = p.input ?? p.args ?? {};

    const title = getOptionalString(payload.title)?.trim();
    const itemsRaw = payload.items;
    const items = Array.isArray(itemsRaw)
      ? itemsRaw.filter((item): item is string => typeof item === "string")
      : [];

    if (!title || items.length === 0) continue;

    cards.push({
      toolCallId: p.toolCallId,
      title,
      items,
      ...(getOptionalString(payload.disclaimer)
        ? { disclaimer: getOptionalString(payload.disclaimer) }
        : {}),
    });
  }

  return cards;
}

function toAnsweredQaPair(part: ToolPartLike | null): ExtractedQaPair | null {
  if (part?.type !== "tool-askQuestion") return null;
  if (part.state !== "output-available" && part.state !== "result") return null;
  if (typeof part.output !== "string" || part.output.trim().length === 0) {
    return null;
  }

  const input = (part.input ?? part.args ?? {}) as AskQuestionInputPayload;
  if (!input.question || !input.type) return null;

  const options = getOptionalOptions(input.options);
  return {
    ...(part.toolCallId ? { toolCallId: part.toolCallId } : {}),
    question: input.question,
    questionType: input.type,
    ...(options ? { options } : {}),
    answer: part.output,
  };
}

function extractAnsweredQaPairs(parts: unknown[]): ExtractedQaPair[] {
  const out: ExtractedQaPair[] = [];

  for (const raw of parts) {
    const pair = toAnsweredQaPair(toToolPart(raw));
    if (pair) out.push(pair);
  }

  return out;
}

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

export function handleChatStreamError(error: unknown): string {
  console.error(`[Chat API] Stream error:`, error);
  if (error instanceof CreditsExhaustedError) {
    return JSON.stringify({
      error: { code: error.code, message: error.toResponseMessage() },
    });
  }
  if (error instanceof GuardrailError) {
    return JSON.stringify({
      error: { code: error.code, message: error.toResponseMessage() },
    });
  }
  if (isProviderRateLimitError(error)) {
    return JSON.stringify({
      error: {
        code: "RATE_LIMITED",
        message:
          "The AI provider is temporarily busy (429 Resource Exhausted). Please retry in a few seconds.",
      },
    });
  }
  return "An error occurred while generating the response.";
}

function isProviderRateLimitError(error: unknown): boolean {
  const statusCode = getErrorStatusCode(error);
  if (statusCode === 429) return true;

  const text = getErrorText(error).toLowerCase();
  if (text.length === 0) return false;

  return [
    "resource exhausted",
    "resource_exhausted",
    "too many requests",
    "rate limit",
    "rate-limit",
    "quota exceeded",
    "error code 429",
  ].some((needle) => text.includes(needle));
}

function parseStoredParts(content: string | undefined): unknown[] {
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hasPartsDelta(previous: unknown[], next: unknown[]): boolean {
  return JSON.stringify(previous) !== JSON.stringify(next);
}

function inferModelUsed(thinkingLevel: ThinkingLevel): string {
  return getModelIdForThinkingLevel(thinkingLevel);
}

function extractReasoningText(
  part: Record<string, unknown>,
): string | undefined {
  if (part.type !== "reasoning") return undefined;
  const text = typeof part.text === "string" ? part.text : undefined;
  if (!text || text.trim().length === 0) return undefined;
  return text.trim();
}

function extractThoughtText(part: Record<string, unknown>): string | undefined {
  if (!part.providerMetadata || typeof part.providerMetadata !== "object") {
    return undefined;
  }
  const metadata = part.providerMetadata as Record<string, unknown>;
  const thought =
    typeof metadata.thought === "string" ? metadata.thought : undefined;
  if (!thought || thought.trim().length === 0) return undefined;
  return thought.trim();
}

function extractThinkingContentFromParts(parts: unknown[]): string | undefined {
  const chunks: string[] = [];

  for (const raw of parts) {
    if (!raw || typeof raw !== "object") continue;
    const part = raw as Record<string, unknown>;
    const reasoningText = extractReasoningText(part);
    if (reasoningText) {
      chunks.push(reasoningText);
      continue;
    }
    const thoughtText = extractThoughtText(part);
    if (thoughtText) chunks.push(thoughtText);
  }

  return chunks.length > 0 ? chunks.join("\n\n") : undefined;
}

function buildEvidenceMessages(
  userQuery: string,
  assistantParts: unknown[],
): ModelMessage[] {
  const assistantContent =
    assistantParts as unknown as AssistantModelMessage["content"];

  return [
    { role: "user", content: userQuery },
    { role: "assistant", content: assistantContent },
  ];
}

function hasNonEmptyContent(value?: string | null): boolean {
  return Boolean(value?.length);
}

function countLines(value?: string | null): number {
  if (!value) return 0;
  return value.split("\n").length;
}

function countMemorySections(value?: string | null): number {
  if (!value) return 0;
  return (value.match(/###/g) ?? []).length;
}

function normalizeEvidenceRagReason(
  reason: string,
  needsRag: boolean,
): EvidenceRagReason {
  if (reason === "attachment") return "attachment";
  if (reason === "record-hint") return "record-hint";
  if (reason === "reasoning-hint") return "reasoning-hint";
  if (reason === "short-query-skip") return "short-query-skip";
  if (reason === "long-query-default") return "long-query-default";
  if (reason === "explicit-override") return "explicit-override";
  if (reason === "continuation-skip") return "short-query-skip";
  if (reason === "triage-no-rag") return "short-query-skip";
  if (reason === "full-mode-forced") return "explicit-override";
  if (reason.startsWith("self-fetch-agent:")) return "explicit-override";
  if (reason.startsWith("always-rag-agent:")) return "explicit-override";

  return needsRag ? "long-query-default" : "short-query-skip";
}

async function captureEvidenceForAssistantMessage(args: {
  profileId: string;
  sessionId: string;
  userId: string;
  assistantMessageId: string;
  responseParts: unknown[];
  userQuery: string;
  agentType: string;
  thinkingLevel: ThinkingLevel;
  tokenUsage?: { promptTokens: number; completionTokens: number };
  options?: {
    preContext?: {
      ragMeta?: {
        requested: boolean;
        used: boolean;
        reused?: boolean;
        reason: string;
        timedOut: boolean;
        partialFailure: boolean;
      };
      memory?: string | null;
      ragContext?: string | null;
    };
    hasAttachment?: boolean;
  };
}) {
  const modelUsed = inferModelUsed(args.thinkingLevel);
  const thinkingContent = extractThinkingContentFromParts(args.responseParts);
  const evidenceMessages = buildEvidenceMessages(
    args.userQuery,
    args.responseParts,
  );

  const extractedEvidence = EvidenceExtractor.extract(
    evidenceMessages,
    thinkingContent,
    {
      agentType: args.agentType,
      thinkingLevel: args.thinkingLevel,
      modelUsed,
    },
  );

  const ragMeta = args.options?.preContext?.ragMeta;
  const memoryContent = args.options?.preContext?.memory;
  const ragContent = args.options?.preContext?.ragContext;
  const normalizedRagReason = ragMeta
    ? normalizeEvidenceRagReason(ragMeta.reason, ragMeta.used)
    : undefined;
  const dynamicContext = [memoryContent, ragContent].filter(Boolean).join("\n");

  const captureResult = await captureEvidenceUseCase.execute(args.profileId, {
    ...extractedEvidence,
    messageId: args.assistantMessageId,
    sessionId: args.sessionId,
    userId: args.userId,
    profileId: args.profileId,
    ...(args.tokenUsage && {
      tokenUsage: {
        promptTokens: args.tokenUsage.promptTokens,
        completionTokens: args.tokenUsage.completionTokens,
        totalTokens:
          args.tokenUsage.promptTokens + args.tokenUsage.completionTokens,
      },
    }),
    creditsUsed: 1,
    gateway: {
      agentType: args.agentType,
      routingReason: "llm",
      thinkingLevel: args.thinkingLevel,
    },
    ...(ragMeta && {
      rag: {
        requested: ragMeta.requested,
        used: ragMeta.used,
        reason: normalizedRagReason ?? "long-query-default",
        timedOut: ragMeta.timedOut,
        partialFailure: ragMeta.partialFailure,
      },
    }),
    reranking: {
      used: ragMeta?.used ?? false,
      documentsReranked: countLines(ragContent),
    },
    memory: {
      retrieved: hasNonEmptyContent(memoryContent),
      count: countMemorySections(memoryContent),
      categories: ["medical", "preference", "lifestyle"],
    },
    prompt: {
      dynamicContextLength: dynamicContext.length,
      modelName: modelUsed,
    },
  });

  if (captureResult.ok) return;

  console.warn("[Chat API] Evidence capture returned ok=false", {
    profileId: args.profileId,
    sessionId: args.sessionId,
    messageId: args.assistantMessageId,
  });
}

function hasAssessmentSyncWork(
  starts: StartAssessmentPayload[],
  qa: ExtractedQaPair[],
  actionCards: ActionCardPayload[],
): boolean {
  return starts.length > 0 || qa.length > 0 || actionCards.length > 0;
}

function createInitialAssessmentSyncState(): AssessmentSyncState {
  return { latestTitle: "Clinical Assessment" };
}

function applyStartToState(
  state: AssessmentSyncState,
  start: StartAssessmentPayload,
): AssessmentSyncState {
  return {
    ...state,
    latestTitle: start.title,
    latestCondition: start.condition,
    latestGuideline: start.guideline,
    latestEstimatedQuestions: start.estimatedQuestions,
    latestEstimatedMinutes: start.estimatedMinutes,
  };
}

function buildAssessmentPayload(args: {
  userId: string;
  sessionId: string;
  specialtyAgent?: string;
  state: AssessmentSyncState;
  runId?: string;
  startedAt?: string;
  qa: ExtractedQaPair[];
  actionCards?: ActionCardPayload[];
}): Record<string, unknown> {
  const guideline = args.state.latestGuideline;

  return {
    userId: args.userId,
    sessionId: args.sessionId,
    ...(args.runId ? { runId: args.runId } : {}),
    specialtyAgent: args.specialtyAgent,
    title: args.state.latestTitle,
    condition: args.state.latestCondition,
    guideline,
    guidelinesFollowed: guideline ? [guideline] : undefined,
    estimatedQuestions: args.state.latestEstimatedQuestions,
    estimatedMinutes: args.state.latestEstimatedMinutes,
    status: "active",
    ...(args.startedAt ? { startedAt: args.startedAt } : {}),
    ...(args.actionCards ? { actionCards: args.actionCards } : {}),
    qa: args.qa,
  };
}

async function persistAssessmentStarts(args: {
  userId: string;
  sessionId: string;
  specialtyAgent?: string;
  starts: StartAssessmentPayload[];
}): Promise<AssessmentSyncState> {
  let state = createInitialAssessmentSyncState();

  for (const start of args.starts) {
    state = applyStartToState(state, start);
    const saved = await new CreateAssessmentUseCase().execute(
      buildAssessmentPayload({
        userId: args.userId,
        sessionId: args.sessionId,
        specialtyAgent: args.specialtyAgent,
        state,
        runId: start.runId,
        startedAt: new Date().toISOString(),
        qa: [],
      }),
    );

    state = {
      ...state,
      latestAssessmentId: saved.id,
      activeRunId: saved.runId ?? start.runId,
    };
  }

  return state;
}

async function resolveConditionIdByName(
  userId: string,
  conditionName?: string,
): Promise<string | undefined> {
  const normalizedConditionName = conditionName?.trim().toLowerCase();
  if (!normalizedConditionName) return undefined;

  try {
    const conditions = await new ListConditionsUseCase().execute({
      userId,
      limit: 200,
    });

    const matched = conditions.find(
      (condition) =>
        condition.name.trim().toLowerCase() === normalizedConditionName,
    );

    return matched?.id;
  } catch (error) {
    console.warn("[Chat API] Failed to resolve conditionId for assessment", {
      userId,
      conditionName,
      error,
    });
    return undefined;
  }
}

async function persistAssessmentProgress(args: {
  userId: string;
  sessionId: string;
  specialtyAgent?: string;
  state: AssessmentSyncState;
  qa: ExtractedQaPair[];
  actionCards: ActionCardPayload[];
}): Promise<void> {
  if (args.qa.length === 0 && args.actionCards.length === 0) return;

  const savedAssessment = await new CreateAssessmentUseCase().execute(
    buildAssessmentPayload({
      userId: args.userId,
      sessionId: args.sessionId,
      specialtyAgent: args.specialtyAgent,
      state: args.state,
      runId: args.state.activeRunId,
      actionCards: args.actionCards,
      qa: args.qa,
    }),
  );

  const finalState: AssessmentSyncState = {
    ...args.state,
    latestAssessmentId: savedAssessment.id,
  };

  await syncSymptomObservationsFromAssessment({
    userId: args.userId,
    sessionId: args.sessionId,
    runId: finalState.activeRunId,
    assessmentId: finalState.latestAssessmentId,
    conditionId: await resolveConditionIdByName(
      args.userId,
      finalState.latestCondition,
    ),
    condition: finalState.latestCondition,
    qa: args.qa,
  });
}

async function syncAssessmentsFromAssistantParts(args: {
  userId: string;
  sessionId: string;
  specialtyAgent?: string;
  parts: unknown[];
}): Promise<void> {
  const starts = extractStarts(args.parts);
  const qa = extractAnsweredQaPairs(args.parts);
  const actionCards = extractActionCards(args.parts);
  if (!hasAssessmentSyncWork(starts, qa, actionCards)) return;

  const state = await persistAssessmentStarts({
    userId: args.userId,
    sessionId: args.sessionId,
    specialtyAgent: args.specialtyAgent,
    starts,
  });

  await persistAssessmentProgress({
    userId: args.userId,
    sessionId: args.sessionId,
    specialtyAgent: args.specialtyAgent,
    state,
    qa,
    actionCards,
  });
}

function buildCapturedUsage(args: {
  totalInputTokens: number;
  totalOutputTokens: number;
}): CapturedUsage | undefined {
  if (args.totalInputTokens <= 0 && args.totalOutputTokens <= 0) {
    return undefined;
  }

  return {
    promptTokens: args.totalInputTokens,
    completionTokens: args.totalOutputTokens,
    totalTokens: args.totalInputTokens + args.totalOutputTokens,
  };
}

export function handleAgentStepFinish(
  state: StreamUsageState,
  stepResult: {
    usage?: { inputTokens?: number; outputTokens?: number };
  },
): void {
  if (!stepResult.usage) return;

  state.totalInputTokens += stepResult.usage.inputTokens ?? 0;
  const stepOutput = stepResult.usage.outputTokens ?? 0;
  state.totalOutputTokens += stepOutput;
  if (stepOutput === 0) state.zeroOutputSteps += 1;
}

export function handleAgentStreamFinish(args: {
  finishPayload: ChatStreamFinishPayload;
  ctx: { storableParts: unknown[]; userQuery: string };
  isUserTurn: boolean;
  toolOutputMerge?: { messageId: string; content: string };
  usageState: StreamUsageState;
  agentType: string;
  setPersistPayload: (payload: PersistPayload | null) => void;
  writer: ChatStreamWriter;
}): void {
  const { responseMessage, finishReason } = args.finishPayload;
  const storableParts = responseMessage.parts.filter(
    (p) => p.type !== "step-start",
  );
  const hasMeaningfulContent = storableParts.some(
    (p) =>
      (p.type === "text" &&
        typeof p.text === "string" &&
        p.text.trim().length > 0) ||
      p.type.startsWith("tool-"),
  );

  const isContinuationTurn = args.isUserTurn
    ? false
    : Boolean(args.toolOutputMerge);
  const continuationHasDelta = isContinuationTurn
    ? hasPartsDelta(
        parseStoredParts(args.toolOutputMerge?.content),
        storableParts,
      )
    : true;

  if (hasMeaningfulContent && continuationHasDelta) {
    args.setPersistPayload({
      responseParts: storableParts,
      userContent:
        args.ctx.storableParts.length > 0
          ? JSON.stringify(args.ctx.storableParts)
          : args.ctx.userQuery,
      continuationMessageId:
        !args.isUserTurn && args.toolOutputMerge
          ? args.toolOutputMerge.messageId
          : undefined,
    });
  } else {
    const emptyReason = hasMeaningfulContent
      ? "no continuation delta"
      : "no meaningful parts";
    const previousParts = parseStoredParts(args.toolOutputMerge?.content);
    console.warn(
      `[Chat API] Empty model response (${emptyReason}). finishReason: ${finishReason ?? "unknown"}, ` +
        `totalOutput: ${args.usageState.totalOutputTokens}, zeroOutputSteps: ${args.usageState.zeroOutputSteps}`,
    );
    console.warn(
      `[Chat API] Continuation diagnostics: isContinuation=${isContinuationTurn}, ` +
        `prevParts=${previousParts.length}, newParts=${storableParts.length}, ` +
        `hasMeaningfulContent=${hasMeaningfulContent}, hasDelta=${continuationHasDelta}`,
    );
    contextCacheService.invalidateFamily(args.agentType);
    args.writer.write({
      type: "data-error",
      data: {
        code: "empty_response",
        message: "The AI returned an empty response. Please try again.",
      },
      transient: true,
    });
  }

  if (
    args.usageState.totalInputTokens > 0 ||
    args.usageState.totalOutputTokens > 0
  ) {
    args.writer.write({
      type: "data-usage",
      data: {
        inputTokens: args.usageState.totalInputTokens,
        outputTokens: args.usageState.totalOutputTokens,
      },
      transient: true,
    });
  }
}

export function streamDirectResponse(args: {
  writer: ChatStreamWriter;
  text: string;
  setPersistPayload: (payload: PersistPayload) => void;
  ctx: { storableParts: unknown[]; userQuery: string };
}): void {
  const textPartId = "text-1";

  args.writer.write({ type: "start-step" });
  args.writer.write({ type: "text-start", id: textPartId });
  args.writer.write({
    type: "text-delta",
    id: textPartId,
    delta: args.text,
  });
  args.writer.write({ type: "text-end", id: textPartId });
  args.writer.write({ type: "finish-step" });
  args.writer.write({ type: "finish", finishReason: "stop" });

  args.setPersistPayload({
    responseParts: [{ type: "text", text: args.text }],
    userContent:
      args.ctx.storableParts.length > 0
        ? JSON.stringify(args.ctx.storableParts)
        : args.ctx.userQuery,
  });
}

export function buildChatResponse(args: {
  stream: Parameters<typeof createUIMessageStreamResponse>[0]["stream"];
  sessionId: string;
}) {
  return createUIMessageStreamResponse({
    stream: args.stream,
    headers: { "X-Session-Id": args.sessionId },
    consumeSseStream: ({ stream: sseStream }) => {
      consumeStream({
        stream: sseStream,
        onError: (error) =>
          console.error("[Chat API] consumeStream error:", error),
      });
    },
  });
}

function parseTurnNode(
  state: ChatPreparationState,
): Partial<ChatPreparationState> {
  return {
    isUserTurn: state.body.message.role === "user",
  };
}

async function prepareChatNode(
  state: ChatPreparationState,
): Promise<Partial<ChatPreparationState>> {
  const preparedChat = await new PrepareChatUseCase().execute({
    userId: state.userId,
    profileId: state.profileId,
    body: state.body,
  });

  return { preparedChat };
}

function initializeUsageNode(): Partial<ChatPreparationState> {
  return {
    usageState: {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      zeroOutputSteps: 0,
    },
  };
}

function finalizePreparationNode(
  state: ChatPreparationState,
): Partial<ChatPreparationState> {
  if (!state.preparedChat) {
    throw new Error("[ChatApiFlowGraph] Missing prepared chat state");
  }

  return {
    result: {
      isUserTurn: state.isUserTurn,
      preparedChat: state.preparedChat,
      usageState: state.usageState,
    },
  };
}

const chatPreparationGraph = new StateGraph(
  Annotation.Root({
    userId: Annotation<string>(),
    profileId: Annotation<string>(),
    body: Annotation<PrepareChatInput["body"]>(),
    isUserTurn: Annotation<boolean>(),
    preparedChat: Annotation<PrepareChatResult | null>(),
    usageState: Annotation<StreamUsageState>(),
    result: Annotation<ChatPreparationGraphOutput | null>(),
  }),
)
  .addNode("parse_turn", parseTurnNode)
  .addNode("prepare_chat", prepareChatNode)
  .addNode("initialize_usage", initializeUsageNode)
  .addNode("finalize", finalizePreparationNode)
  .addEdge(START, "parse_turn")
  .addEdge("parse_turn", "prepare_chat")
  .addEdge("prepare_chat", "initialize_usage")
  .addEdge("initialize_usage", "finalize")
  .addEdge("finalize", END)
  .compile();

export async function runChatPreparationGraph(
  input: ChatPreparationGraphInput,
): Promise<ChatPreparationGraphOutput> {
  const finalState = (await chatPreparationGraph.invoke({
    ...input,
    isUserTurn: false,
    preparedChat: null,
    usageState: {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      zeroOutputSteps: 0,
    },
    result: null,
  })) as ChatPreparationState;

  if (!finalState.result) {
    throw new Error("[ChatApiFlowGraph] Missing finalized preparation result");
  }

  return finalState.result;
}

async function persistUserMessageNode(
  state: ChatPersistenceState,
): Promise<Partial<ChatPersistenceState>> {
  if (!state.isUserTurn) return {};

  try {
    await new AddMessageUseCase().execute({
      userId: state.userId,
      profileId: state.profileId,
      sessionId: state.sessionId,
      title: state.ctx.title,
      role: "user",
      content:
        state.ctx.storableParts.length > 0
          ? JSON.stringify(state.ctx.storableParts)
          : state.ctx.userQuery,
    });
  } catch (saveError) {
    console.error("[Chat API] Failed to save user message:", saveError);
  }

  return {};
}

function decideAssistantPersistenceNode(
  state: ChatPersistenceState,
): Partial<ChatPersistenceState> {
  if (state.persistPayload) {
    return {
      skipPersistence: false,
      capturedUsage: buildCapturedUsage({
        totalInputTokens: state.totalInputTokens,
        totalOutputTokens: state.totalOutputTokens,
      }),
    };
  }

  console.warn(
    "[Chat API] after(): no assistant response captured (client disconnected early)",
  );
  return { skipPersistence: true };
}

async function persistAssistantMessageNode(
  state: ChatPersistenceState,
): Promise<Partial<ChatPersistenceState>> {
  if (state.skipPersistence || !state.persistPayload) {
    return {};
  }

  if (state.capturedUsage) {
    console.log(
      `[Chat API] Agent usage — Input: ${state.capturedUsage.promptTokens}, Output: ${state.capturedUsage.completionTokens}`,
    );
  }

  try {
    if (state.persistPayload.continuationMessageId) {
      console.log(
        "[Chat API] Updating existing assistant message (continuation)...",
      );
      await messageRepository.updateContent(
        state.userId,
        state.profileId,
        state.sessionId,
        state.persistPayload.continuationMessageId,
        JSON.stringify(state.persistPayload.responseParts),
        state.capturedUsage,
      );
      return { assistantMessageId: state.persistPayload.continuationMessageId };
    }

    console.log("[Chat API] Saving assistant message to Firestore...");
    const savedAssistant = await new AddMessageUseCase().execute({
      userId: state.userId,
      profileId: state.profileId,
      sessionId: state.sessionId,
      role: "assistant",
      content: JSON.stringify(state.persistPayload.responseParts),
      ...(state.capturedUsage ? { usage: state.capturedUsage } : {}),
      agentType: state.agentType,
    });

    console.log("[Chat API] Assistant message saved successfully");
    return { assistantMessageId: savedAssistant.id };
  } catch (saveError) {
    console.error("[Chat API] Failed to save assistant message:", saveError);
    return {};
  }
}

async function persistAssistantArtifactsNode(
  state: ChatPersistenceState,
): Promise<Partial<ChatPersistenceState>> {
  if (
    state.skipPersistence ||
    !state.persistPayload ||
    !state.assistantMessageId
  ) {
    return {};
  }

  await syncAssessmentsFromAssistantParts({
    userId: state.userId,
    sessionId: state.sessionId,
    specialtyAgent: state.agentType,
    parts: state.persistPayload.responseParts,
  });

  try {
    await captureEvidenceForAssistantMessage({
      profileId: state.profileId,
      sessionId: state.sessionId,
      userId: state.userId,
      assistantMessageId: state.assistantMessageId,
      responseParts: state.persistPayload.responseParts,
      userQuery: state.ctx.userQuery,
      agentType: state.agentType,
      thinkingLevel: state.options.thinkingLevel ?? "medium",
      tokenUsage: state.capturedUsage
        ? {
            promptTokens: state.capturedUsage.promptTokens,
            completionTokens: state.capturedUsage.completionTokens,
          }
        : undefined,
      options: {
        preContext: state.options.preContext,
        hasAttachment: state.options.hasAttachment,
      },
    });
  } catch (evidenceError) {
    console.error("[Chat API] Evidence capture exception", {
      profileId: state.profileId,
      sessionId: state.sessionId,
      messageId: state.assistantMessageId,
      error: evidenceError,
    });
  }

  try {
    const groundingEvaluation = state.options.preContext?.ragMeta?.evaluation;
    const ragContext = state.options.preContext?.ragContext;
    const canPersistGrounding = shouldPersistGroundingCache({
      hasAttachment: state.options.hasAttachment,
      ragContext,
      evaluation: groundingEvaluation,
      partialFailure: state.options.preContext?.ragMeta?.partialFailure,
    });

    if (canPersistGrounding) {
      await new SetSessionGroundingUseCase().execute({
        userId: state.userId,
        profileId: state.profileId,
        sessionId: state.sessionId,
        agentType: state.agentType,
        query: state.ctx.userQuery,
        normalizedQuery: normalizeGroundingQuery(state.ctx.userQuery),
        queryEmbedding: state.options.preContext?.queryEmbedding,
        context: ragContext ?? "",
        responseMode: state.options.responseMode ?? "quick",
        hasAttachment: state.options.hasAttachment,
        evaluation: groundingEvaluation,
      });
    }
  } catch (groundingError) {
    console.error("[Chat API] Failed to persist session grounding:", {
      sessionId: state.sessionId,
      profileId: state.profileId,
      error: groundingError,
    });
  }

  return {};
}

async function finalizePersistenceNode(
  state: ChatPersistenceState,
): Promise<Partial<ChatPersistenceState>> {
  if (state.skipPersistence || !state.persistPayload) {
    return { result: { persisted: false } };
  }

  revalidateTag(CacheTags.usage(state.userId), "seconds");
  revalidateTag(CacheTags.sessions(state.userId), "seconds");
  revalidateTag(CacheTags.assessments(state.userId), "minutes");
  revalidateTag(CacheTags.medications(state.userId), "minutes");
  revalidateTag(CacheTags.symptomObservations(state.userId), "minutes");

  try {
    if (state.agentType !== "triageNurse") {
      await new SetSessionAgentUseCase().execute({
        userId: state.userId,
        profileId: state.profileId,
        sessionId: state.sessionId,
        agentType: state.agentType,
      });
    }
  } catch (agentErr) {
    console.error("[Chat API] Failed to persist session agent type:", agentErr);
  }

  try {
    await extractAndSaveMemories({
      userId: state.userId,
      profileId: state.profileId,
      sessionId: state.sessionId,
      userMessage: state.ctx.userQuery,
      assistantMessage: extractTextFromParts(
        state.persistPayload.responseParts,
      ),
    });
  } catch (memErr) {
    console.error("[Chat API] Memory extraction failed:", memErr);
  }

  return { result: { persisted: true } };
}

const chatPersistenceGraph = new StateGraph(
  Annotation.Root({
    isUserTurn: Annotation<boolean>(),
    userId: Annotation<string>(),
    profileId: Annotation<string>(),
    sessionId: Annotation<string>(),
    agentType: Annotation<string>(),
    ctx: Annotation<ChatPersistenceGraphInput["ctx"]>(),
    persistPayload: Annotation<PersistPayload | null>(),
    totalInputTokens: Annotation<number>(),
    totalOutputTokens: Annotation<number>(),
    options: Annotation<BackgroundPersistOptions>(),
    capturedUsage: Annotation<CapturedUsage | undefined>(),
    assistantMessageId: Annotation<string | undefined>(),
    skipPersistence: Annotation<boolean>(),
    result: Annotation<{ persisted: boolean } | null>(),
  }),
)
  .addNode("persist_user", persistUserMessageNode)
  .addNode("decide_assistant_persistence", decideAssistantPersistenceNode)
  .addNode("persist_assistant_message", persistAssistantMessageNode)
  .addNode("persist_assistant_artifacts", persistAssistantArtifactsNode)
  .addNode("finalize_persistence", finalizePersistenceNode)
  .addEdge(START, "persist_user")
  .addEdge("persist_user", "decide_assistant_persistence")
  .addEdge("decide_assistant_persistence", "persist_assistant_message")
  .addEdge("persist_assistant_message", "persist_assistant_artifacts")
  .addEdge("persist_assistant_artifacts", "finalize_persistence")
  .addEdge("finalize_persistence", END)
  .compile();

export async function runChatPersistenceGraph(
  input: ChatPersistenceGraphInput,
): Promise<{ persisted: boolean }> {
  const finalState = (await chatPersistenceGraph.invoke({
    ...input,
    capturedUsage: undefined,
    assistantMessageId: undefined,
    skipPersistence: false,
    result: null,
  })) as ChatPersistenceState;

  return finalState.result ?? { persisted: false };
}

export function scheduleChatPersistence(args: {
  isUserTurn: boolean;
  userId: string;
  profileId: string;
  sessionId: string;
  agentType: string;
  ctx: { title: string; storableParts: unknown[]; userQuery: string };
  getPersistPayload: () => PersistPayload | null;
  getUsageState: () => StreamUsageState;
  options: BackgroundPersistOptions;
}): void {
  after(async () => {
    const usageState = args.getUsageState();
    await runChatPersistenceGraph({
      isUserTurn: args.isUserTurn,
      userId: args.userId,
      profileId: args.profileId,
      sessionId: args.sessionId,
      agentType: args.agentType,
      ctx: args.ctx,
      persistPayload: args.getPersistPayload(),
      totalInputTokens: usageState.totalInputTokens,
      totalOutputTokens: usageState.totalOutputTokens,
      options: args.options,
    });
  });
}
