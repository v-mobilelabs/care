import type { FileLabel } from "@/data/files";
import { labReportRepository } from "@/data/lab-reports";
import { getCachedProfile } from "@/data/cached";
import { safeValidateUIMessages } from "ai";
import type { UIMessage, Agent, ToolSet } from "ai";
import { z } from "zod";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { ApiError } from "@/lib/api/with-context";
import { extractMessageContext } from "@/lib/chat/helpers";
import type { MessageContext } from "@/lib/chat/helpers";
import {
  prescriptionChatAgent,
  labReportChatAgent,
  dietPlannerChatAgent,
  patientAgent,
  generalMedicineAgent,
  neurologyAgent,
  cardiologyAgent,
  mentalHealthAgent,
  dermatologyAgent,
  pediatricsAgent,
  womensHealthAgent,
  orthopedicsAgent,
  gastroenterologyAgent,
  endocrinologyAgent,
  urologyAgent,
  radiologyAgent,
  dentistryAgent,
  nutritionAgent,
  immunologyAgent,
  entAgent,
  ophthalmologyAgent,
  nephrologyAgent,
  triageNurseAgent,
} from "@/data/shared/service/agents";
import type { AgentCallOptions } from "@/data/shared/service/agents/base/agent";
import type { AgentType } from "@/data/shared/service/agents";
import {
  runPreflightChecks,
  fetchMemory,
} from "@/data/shared/service/middleware/pre-run";
import type { PreRunContext } from "@/data/shared/service/middleware/pre-run";
import { runGatewayOrchestrator } from "@/workflow/gateway-orchestrator.workflow";
import { classifyKnownProfileIntent } from "@/data/shared/service/agents/gateway/known-profile-intent";
import { messageRepository } from "../repositories/message.repository";
import { sessionRepository } from "../repositories/session.repository";
import { toUIMessage } from "../models/message.model";
import type { SessionGroundingCacheDocument } from "../models/session.model";
import type { ProfileDto } from "@/data/profile";

// ── Input schema ──────────────────────────────────────────────────────────────

const PrepareChatSchema = z.object({
  userId: z.string().min(1),
  profileId: z.string().min(1),
  // One-cycle payload: client sends exactly ONE UIMessage object under `message`
  // (server-managed persistence pattern). Using .strict() rejects the legacy
  // `messages: UIMessage[]` array format with a clear validation error.
  body: z
    .object({
      message: z.record(z.string(), z.unknown()),
      sessionId: z.string().optional(),
      chatMode: z.enum(["quick", "full"]).optional(),
      agentOverride: z.string().optional(),
      attachmentUrls: z
        .array(
          z.object({
            fileId: z.string().optional(),
            url: z.string(),
            mediaType: z.string(),
            fileName: z.string().optional(),
            label: z.custom<FileLabel>().optional(),
          }),
        )
        .optional(),
    })
    .strict(),
});

export type PrepareChatInput = z.infer<typeof PrepareChatSchema>;

type ReportHandoffSignal = {
  nextSpecialist: string;
  autoRoute: boolean;
  reason?: string;
  reportLabel?: string;
};

type ToolPartLike = {
  type: string;
  state?: string;
  toolCallId?: string;
  input?: unknown;
  output?: unknown;
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function isToolPartLike(part: unknown): part is ToolPartLike {
  const p = asObject(part);
  return Boolean(p && typeof p.type === "string" && p.type.startsWith("tool-"));
}

function getToolPartName(part: unknown): string | null {
  if (!isToolPartLike(part)) return null;
  return part.type.slice(5);
}

function collectOutputAvailableToolParts(
  parts: UIMessage["parts"],
): UIMessage["parts"][number][] {
  return parts.filter(
    (p) => isToolPartLike(p) && p.state === "output-available",
  );
}

function normalizeQuestionAnswerValue(answer: unknown): string | null {
  if (answer === null || answer === undefined) return null;

  if (typeof answer === "string") {
    return answer.trim().length > 0 ? answer : null;
  }

  if (typeof answer === "number" || typeof answer === "boolean") {
    return String(answer);
  }

  if (Array.isArray(answer)) {
    const values = answer
      .map((v) => {
        if (typeof v === "string") return v.trim();
        if (v === null || v === undefined) return "";
        return String(v);
      })
      .filter((v) => v.length > 0);
    return values.length > 0 ? values.join(", ") : null;
  }

  try {
    const serialized = JSON.stringify(answer);
    if (!serialized || serialized === "{}" || serialized === "[]") {
      return null;
    }
    return serialized;
  } catch {
    return null;
  }
}

function mergeToolOutputsIntoAssistantParts(
  targetParts: UIMessage["parts"],
  incomingToolOutputs: UIMessage["parts"][number][],
): {
  mergedParts: UIMessage["parts"];
  mergedById: number;
  mergedByFallback: number;
  unresolved: number;
} {
  if (incomingToolOutputs.length === 0) {
    return {
      mergedParts: targetParts,
      mergedById: 0,
      mergedByFallback: 0,
      unresolved: 0,
    };
  }

  const mergedParts = [...targetParts];
  const consumedTargetIdx = new Set<number>();
  const consumedOutputIdx = new Set<number>();

  let mergedById = 0;
  let mergedByFallback = 0;

  // Pass 1: strict toolCallId match.
  for (let i = 0; i < incomingToolOutputs.length; i += 1) {
    const out = incomingToolOutputs[i];
    const outputId = (out as { toolCallId?: string }).toolCallId ?? "";
    if (!outputId) continue;

    const targetIdx = mergedParts.findIndex((p, idx) => {
      if (!isToolPartLike(p)) return false;
      if (consumedTargetIdx.has(idx)) return false;
      return (p.toolCallId ?? "") === outputId;
    });

    if (targetIdx >= 0) {
      mergedParts[targetIdx] = out;
      consumedTargetIdx.add(targetIdx);
      consumedOutputIdx.add(i);
      mergedById += 1;
    }
  }

  // Pass 2: fallback by tool name to handle empty/missing toolCallId.
  for (let i = 0; i < incomingToolOutputs.length; i += 1) {
    if (consumedOutputIdx.has(i)) continue;
    const out = incomingToolOutputs[i];
    const outName = getToolPartName(out);
    if (!outName) continue;

    const targetIdx = mergedParts.findIndex((p, idx) => {
      if (!isToolPartLike(p)) return false;
      if (consumedTargetIdx.has(idx)) return false;
      if (getToolPartName(p) !== outName) return false;
      // Prefer open/pending tool states that are waiting for client output.
      return (
        p.state === "input-available" ||
        p.state === "approval-requested" ||
        p.state === "input-streaming"
      );
    });

    if (targetIdx >= 0) {
      mergedParts[targetIdx] = out;
      consumedTargetIdx.add(targetIdx);
      consumedOutputIdx.add(i);
      mergedByFallback += 1;
    }
  }

  return {
    mergedParts,
    mergedById,
    mergedByFallback,
    unresolved: incomingToolOutputs.length - consumedOutputIdx.size,
  };
}

function readReportHandoffFromPart(
  part: UIMessage["parts"][number],
): ReportHandoffSignal | null {
  if (!isToolPartLike(part)) return null;

  const toolName = getToolPartName(part);

  // Explicit referral request tool is the strongest handoff signal.
  if (toolName === "submitReferralRequest") {
    const input = asObject(part.input);
    const nextSpecialistRaw = input?.nextSpecialist;
    if (
      typeof nextSpecialistRaw !== "string" ||
      nextSpecialistRaw.trim().length === 0
    ) {
      return null;
    }

    const reasonRaw = input?.reason;
    const reportLabelRaw = input?.reportLabel;
    return {
      nextSpecialist: nextSpecialistRaw.trim(),
      autoRoute: true,
      reason: typeof reasonRaw === "string" ? reasonRaw : undefined,
      reportLabel:
        typeof reportLabelRaw === "string" ? reportLabelRaw : undefined,
    };
  }

  // Fallback: legacy/implicit handoff encoded in submitReport input/output.
  if (toolName !== "submitReport") return null;

  const input = asObject(part.input);
  const output = asObject(part.output);
  const handoff = asObject(input?.handoff);

  const nextSpecialistRaw =
    handoff?.nextSpecialist ??
    input?.suggestedNextSpecialist ??
    output?.nextSpecialist;
  if (
    typeof nextSpecialistRaw !== "string" ||
    nextSpecialistRaw.trim().length === 0
  ) {
    return null;
  }

  const autoRouteRaw = handoff?.autoRoute ?? output?.autoRoute;
  const reasonRaw = handoff?.reason ?? output?.handoffReason;
  const reportLabelRaw = input?.reportLabel ?? output?.reportLabel;

  return {
    nextSpecialist: nextSpecialistRaw.trim(),
    autoRoute: typeof autoRouteRaw === "boolean" ? autoRouteRaw : true,
    reason: typeof reasonRaw === "string" ? reasonRaw : undefined,
    reportLabel:
      typeof reportLabelRaw === "string" ? reportLabelRaw : undefined,
  };
}

function findLatestReportHandoff(
  messages: ReadonlyArray<UIMessage>,
): ReportHandoffSignal | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role !== "assistant") continue;

    for (let j = message.parts.length - 1; j >= 0; j -= 1) {
      const handoff = readReportHandoffFromPart(message.parts[j]);
      if (handoff?.autoRoute) return handoff;
    }
  }
  return undefined;
}

// ── Output ────────────────────────────────────────────────────────────────────

export interface PrepareChatResult {
  agent: Agent<AgentCallOptions, ToolSet>;
  sanitizedMessages: UIMessage[];
  messages: UIMessage[];
  options: AgentCallOptions;
  agentType: AgentType;
  loadingHints: string[];
  sessionId: string;
  ctx: MessageContext;
  gatewayReasoning: string;
  directResponse?: {
    text: string;
    source: "known-profile-context";
    reason: string;
  };
  /** When tool outputs are merged into an existing DB assistant message. */
  toolOutputMerge?: { messageId: string; content: string };
}

type PreparedConversation = {
  incomingMessage: UIMessage;
  messages: UIMessage[];
  toolOutputMerge?: { messageId: string; content: string };
};

type SessionRoutingState = {
  lastAgentType?: string;
  groundingCache: SessionGroundingCacheDocument[];
};

type GatewayMetadata = {
  recentMessages: string[];
  attachmentMetadata: Array<{
    fileId?: string;
    url: string;
    mediaType: string;
    fileName?: string;
    label?: FileLabel;
    extractedSummary?: {
      testName?: string;
      labName?: string;
      notes?: string;
      biomarkerNames: string[];
    };
  }>;
  reportHandoff?: ReportHandoffSignal;
};

type GatewayResolution = {
  agentType: AgentType;
  needsRag: boolean;
  thinkingLevel: AgentCallOptions["thinkingLevel"];
  gatewayReasoning: string;
  loadingHints: string[];
  directResponse?: {
    text: string;
    source: "known-profile-context";
    reason: string;
  };
  preContext: PreRunContext;
};

async function validateIncomingMessage(
  message: Record<string, unknown>,
): Promise<UIMessage> {
  const validationResult = safeValidateUIMessages({ messages: [message] });
  const result = await Promise.resolve(validationResult);
  if (!result.success || !result.data.length) {
    throw ApiError.badRequest("message is required.");
  }

  return {
    ...result.data[0],
    parts: result.data[0].parts.filter((p) => p.type !== "step-start"),
  };
}

function mergeIncomingMessageIntoHistory(args: {
  history: UIMessage[];
  incomingMessage: UIMessage;
}): {
  messages: UIMessage[];
  toolOutputMerge?: { messageId: string; content: string };
} {
  const { history, incomingMessage } = args;
  const existingIdx = history.findIndex((m) => m.id === incomingMessage.id);
  if (existingIdx >= 0) {
    const incomingToolOutputs = collectOutputAvailableToolParts(
      incomingMessage.parts,
    );
    if (incomingToolOutputs.length === 0) {
      return { messages: history };
    }

    const mergeResult = mergeToolOutputsIntoAssistantParts(
      history[existingIdx].parts,
      incomingToolOutputs,
    );
    console.log(
      `[PrepareChatUseCase] Merge(existing assistant): incoming=${incomingToolOutputs.length}, byId=${mergeResult.mergedById}, fallback=${mergeResult.mergedByFallback}, unresolved=${mergeResult.unresolved}`,
    );

    history[existingIdx] = incomingMessage;
    return {
      messages: history,
      toolOutputMerge: {
        messageId: history[existingIdx].id,
        content: JSON.stringify(mergeResult.mergedParts),
      },
    };
  }

  if (incomingMessage.role !== "assistant") {
    return { messages: [...history, incomingMessage] };
  }

  const lastAssistantIdx = history.findLastIndex((m) => m.role === "assistant");
  if (lastAssistantIdx < 0) {
    return { messages: [...history, incomingMessage] };
  }

  const incomingToolOutputs = collectOutputAvailableToolParts(
    incomingMessage.parts,
  );
  if (incomingToolOutputs.length === 0) {
    return { messages: history };
  }

  const mergeResult = mergeToolOutputsIntoAssistantParts(
    history[lastAssistantIdx].parts,
    incomingToolOutputs,
  );
  console.log(
    `[PrepareChatUseCase] Merge(last assistant): incoming=${incomingToolOutputs.length}, byId=${mergeResult.mergedById}, fallback=${mergeResult.mergedByFallback}, unresolved=${mergeResult.unresolved}`,
  );

  history[lastAssistantIdx] = incomingMessage;
  return {
    messages: history,
    toolOutputMerge: {
      messageId: history[lastAssistantIdx].id,
      content: JSON.stringify(mergeResult.mergedParts),
    },
  };
}

async function prepareConversation(args: {
  userId: string;
  profileId: string;
  body: PrepareChatInput["body"];
}): Promise<PreparedConversation> {
  const incomingMessage = await validateIncomingMessage(args.body.message);

  if (!args.body.sessionId) {
    return { incomingMessage, messages: [incomingMessage] };
  }

  const historyDtos = await messageRepository.listAllForSession(
    args.userId,
    args.profileId,
    args.body.sessionId,
  );
  const history = historyDtos.length > 0 ? historyDtos.map(toUIMessage) : [];

  const merged = mergeIncomingMessageIntoHistory({
    history,
    incomingMessage,
  });

  return {
    incomingMessage,
    messages: merged.messages,
    toolOutputMerge: merged.toolOutputMerge,
  };
}

function buildContinuationUserQuery(parts: UIMessage["parts"]): string | null {
  const qaPairs = collectOutputAvailableToolParts(parts)
    .map((part) => {
      const toolName = getToolPartName(part);
      if (toolName !== "askQuestion") return null;

      const toolPart = part as ToolPartLike;
      const input = asObject(toolPart.input);
      const output = asObject(toolPart.output);
      const question =
        typeof input?.question === "string" ? input.question : "";
      const answer = normalizeQuestionAnswerValue(output?.answer);
      return question && answer
        ? `Question: ${question}\nAnswer: ${answer}`
        : null;
    })
    .filter((pair): pair is string => Boolean(pair));

  return qaPairs.length > 0 ? qaPairs.join("\n\n") : null;
}

function applyContinuationContextOverride(args: {
  incomingMessage: UIMessage;
  ctx: MessageContext;
}): void {
  if (args.incomingMessage.role !== "assistant") return;

  const continuationQuery = buildContinuationUserQuery(
    args.incomingMessage.parts,
  );
  if (continuationQuery) {
    args.ctx.userQuery = continuationQuery;
  }
}

async function loadSessionRoutingState(args: {
  userId: string;
  profileId: string;
  sessionId?: string;
}): Promise<SessionRoutingState> {
  if (!args.sessionId) {
    return { groundingCache: [] };
  }

  const session = await sessionRepository.findById(
    args.userId,
    args.profileId,
    args.sessionId,
  );
  const groundingCache = await sessionRepository.getGroundingCache(
    args.userId,
    args.profileId,
    args.sessionId,
  );

  return {
    lastAgentType: session?.lastAgentType,
    groundingCache,
  };
}

function collectRecentUserMessages(messages: UIMessage[]): string[] {
  return messages
    .filter((m) => m.role === "user")
    .slice(-4)
    .map((m) => m.parts.find((p) => p.type === "text"))
    .filter((p): p is { type: "text"; text: string } => p?.type === "text")
    .map((p) => p.text);
}

function collectAttachmentMetadata(
  ctx: MessageContext,
): GatewayMetadata["attachmentMetadata"] {
  return ctx.storableParts
    .filter(
      (p) => (p.type as string) === "file" || (p.type as string) === "image",
    )
    .map((p) => ({
      fileId: (p.fileId as string | undefined) ?? undefined,
      url: (p.url as string) ?? "",
      mediaType: (p.mediaType as string) ?? "application/octet-stream",
      fileName: (p.fileName as string | undefined) ?? undefined,
      label: (p.label as FileLabel | undefined) ?? undefined,
    }));
}

async function enrichAttachmentMetadata(args: {
  userId: string;
  attachmentMetadata: GatewayMetadata["attachmentMetadata"];
}): Promise<GatewayMetadata["attachmentMetadata"]> {
  return Promise.all(
    args.attachmentMetadata.map(async (attachment) => {
      if (!attachment.fileId) {
        return attachment;
      }

      const labReport = await labReportRepository
        .findByFileId(args.userId, attachment.fileId)
        .catch(() => null);
      if (!labReport) {
        return attachment;
      }

      const biomarkerNames = labReport.biomarkers
        .map((biomarker) => biomarker.name.trim())
        .filter((name) => name.length > 0)
        .slice(0, 12);

      return {
        ...attachment,
        extractedSummary: {
          testName: labReport.testName,
          labName: labReport.labName,
          notes: labReport.notes,
          biomarkerNames,
        },
      };
    }),
  );
}

async function buildGatewayMetadata(
  userId: string,
  messages: UIMessage[],
  ctx: MessageContext,
): Promise<GatewayMetadata> {
  const attachmentMetadata = await enrichAttachmentMetadata({
    userId,
    attachmentMetadata: collectAttachmentMetadata(ctx),
  });

  return {
    recentMessages: collectRecentUserMessages(messages),
    attachmentMetadata,
    reportHandoff: findLatestReportHandoff(messages),
  };
}

function sanitizeMessagesForAgent(
  messages: UIMessage[],
  agent: Agent<AgentCallOptions, ToolSet>,
): UIMessage[] {
  const supportedToolNames = new Set(Object.keys(agent.tools ?? {}));

  return messages.map((message) => {
    if (message.role !== "assistant") return message;

    const sanitizedParts = message.parts.filter((part) => {
      if (!isToolPartLike(part)) return true;

      const toolName = getToolPartName(part);
      if (!toolName || !supportedToolNames.has(toolName)) {
        return false;
      }

      return (
        part.state !== "input-available" && part.state !== "approval-requested"
      );
    });

    if (sanitizedParts.length === message.parts.length) return message;

    return {
      ...message,
      parts: sanitizedParts,
    };
  });
}

function buildGatewayResolution(args: {
  memory: string | null;
  orchestratorResult: Awaited<ReturnType<typeof runGatewayOrchestrator>>;
}): GatewayResolution {
  return {
    agentType: args.orchestratorResult.agentType,
    needsRag: args.orchestratorResult.needsRag,
    thinkingLevel: args.orchestratorResult.thinkingLevel,
    gatewayReasoning: args.orchestratorResult.reasoning,
    loadingHints: args.orchestratorResult.loadingHints,
    directResponse: args.orchestratorResult.directResponse,
    preContext: {
      memory: args.memory,
      ragContext: args.orchestratorResult.ragContext,
      queryEmbedding: args.orchestratorResult.queryEmbedding,
      ragMeta: args.orchestratorResult.ragMeta,
    },
  };
}

function buildAgentOptions(args: {
  userId: string;
  profileId: string;
  userQuery: string;
  sessionId: string;
  hasAttachment: boolean;
  profile: ProfileDto | null;
  thinkingLevel: AgentCallOptions["thinkingLevel"];
  needsRag: boolean;
  preContext: PreRunContext;
  responseMode: "quick" | "full";
}): AgentCallOptions {
  return {
    userId: args.userId,
    profileId: args.profileId,
    userQuery: args.userQuery,
    sessionId: args.sessionId,
    hasAttachment: args.hasAttachment,
    queryEmbedding: args.preContext.queryEmbedding,
    profile: args.profile,
    thinkingLevel: args.thinkingLevel,
    needsRag: args.needsRag,
    preContext: args.preContext,
    responseMode: args.responseMode,
  };
}

async function fetchPreparedProfile(
  profileId: string,
): Promise<ProfileDto | null> {
  const profile = await getCachedProfile(profileId).catch(() => null);
  return profile && "kind" in profile ? profile : null;
}

async function resolveGatewayState(args: {
  userId: string;
  profileId: string;
  profile: ProfileDto | null;
  originalUserQuery: string;
  userQuery: string;
  hasAttachment: boolean;
  isContinuationTurn: boolean;
  lastAgentType?: string;
  groundingCache?: SessionGroundingCacheDocument[];
  gatewayMetadata: GatewayMetadata;
  sessionId: string;
  responseMode: "quick" | "full";
}): Promise<GatewayResolution> {
  await runPreflightChecks({
    userId: args.userId,
    userQuery: args.originalUserQuery.trim(),
    skipGuardrail: args.isContinuationTurn,
  });

  const knownProfileIntentHint = args.hasAttachment
    ? null
    : await classifyKnownProfileIntent(args.userQuery);

  const orchestratorArgs = {
    userId: args.userId,
    profileId: args.profileId,
    userQuery: args.userQuery,
    profile: args.profile,
    hasAttachment: args.hasAttachment,
    isContinuationTurn: args.isContinuationTurn,
    lastAgentType: args.lastAgentType,
    recentMessages:
      args.gatewayMetadata.recentMessages.length > 1
        ? args.gatewayMetadata.recentMessages
        : undefined,
    attachmentMetadata:
      args.gatewayMetadata.attachmentMetadata.length > 0
        ? args.gatewayMetadata.attachmentMetadata
        : undefined,
    reportHandoff: args.gatewayMetadata.reportHandoff,
    groundingCache: args.groundingCache ?? undefined,
    sessionId: args.sessionId,
    knownProfileIntentHint,
    responseMode: args.responseMode,
    evaluatorModel:
      (process.env.AI_RAG_EVALUATOR_MODEL as "lite" | "fast" | "pro") ?? "fast",
    repairModel:
      (process.env.AI_RAG_REPAIR_MODEL as "lite" | "fast" | "pro") ?? "fast",
    webFallbackTimeoutMs: Number.parseInt(
      process.env.AI_WEB_FALLBACK_TIMEOUT_MS ?? "5000",
      10,
    ),
  } as const;

  const prefersDirectProfileFastPath =
    !args.hasAttachment && knownProfileIntentHint !== null;

  if (prefersDirectProfileFastPath) {
    const orchestratorResult = await runGatewayOrchestrator(orchestratorArgs);
    if (orchestratorResult.directResponse) {
      return buildGatewayResolution({ memory: null, orchestratorResult });
    }

    const memory = await fetchMemory(args.profileId);
    return buildGatewayResolution({ memory, orchestratorResult });
  }

  const [memory, orchestratorResult] = await Promise.all([
    fetchMemory(args.profileId),
    runGatewayOrchestrator(orchestratorArgs),
  ]);

  return buildGatewayResolution({ memory, orchestratorResult });
}

// ── Use case ──────────────────────────────────────────────────────────────────

const AGENTS = {
  dietPlanner: dietPlannerChatAgent,
  prescription: prescriptionChatAgent,
  labReport: labReportChatAgent,
  patient: patientAgent,
  generalMedicine: generalMedicineAgent,
  neurology: neurologyAgent,
  cardiology: cardiologyAgent,
  mentalHealth: mentalHealthAgent,
  dermatology: dermatologyAgent,
  pediatrics: pediatricsAgent,
  womensHealth: womensHealthAgent,
  orthopedics: orthopedicsAgent,
  gastroenterology: gastroenterologyAgent,
  endocrinology: endocrinologyAgent,
  urology: urologyAgent,
  radiology: radiologyAgent,
  dentistry: dentistryAgent,
  nutrition: nutritionAgent,
  immunology: immunologyAgent,
  ent: entAgent,
  ophthalmology: ophthalmologyAgent,
  nephrology: nephrologyAgent,
  triageNurse: triageNurseAgent,
} as const;

export class PrepareChatUseCase extends UseCase<
  PrepareChatInput,
  PrepareChatResult
> {
  static validate(input: unknown): PrepareChatInput {
    return PrepareChatSchema.parse(input);
  }

  protected async run(input: PrepareChatInput): Promise<PrepareChatResult> {
    const { userId, profileId, body } = input;
    const { incomingMessage, messages, toolOutputMerge } =
      await prepareConversation({ userId, profileId, body });

    // ── 3. Extract message context ────────────────────────────────────────
    const ctxStart = performance.now();
    const ctx = extractMessageContext(messages, body.attachmentUrls);
    const originalUserQuery = ctx.userQuery;
    applyContinuationContextOverride({ incomingMessage, ctx });

    console.log(
      `[PrepareChatUseCase] Context extraction: ${(performance.now() - ctxStart).toFixed(0)}ms`,
    );

    // ── 4. Resolve sessionId ─────────────────────────────────────────────────
    const sessionId = body.sessionId || crypto.randomUUID();
    const responseMode = body.chatMode ?? "quick";

    // ── 5. Gateway routing ────────────────────────────────────────────────
    const gatewayStart = performance.now();
    const isContinuationTurn = incomingMessage.role === "assistant";
    const { lastAgentType, groundingCache } = await loadSessionRoutingState({
      userId,
      profileId,
      sessionId: body.sessionId,
    });
    const [gatewayMetadata, profile] = await Promise.all([
      buildGatewayMetadata(userId, messages, ctx),
      fetchPreparedProfile(profileId),
    ]);

    const {
      agentType,
      needsRag,
      thinkingLevel,
      gatewayReasoning,
      loadingHints,
      directResponse,
      preContext,
    } = await resolveGatewayState({
      userId,
      profileId,
      profile,
      originalUserQuery,
      userQuery: ctx.userQuery,
      hasAttachment: ctx.hasAttachment,
      isContinuationTurn,
      lastAgentType,
      groundingCache,
      gatewayMetadata,
      sessionId,
      responseMode,
    });

    console.log(
      `[PrepareChatUseCase] Gateway + prefetch: ${agentType} (mode: ${responseMode}, thinking: ${thinkingLevel}, rag: ${needsRag}, ${(performance.now() - gatewayStart).toFixed(0)}ms)`,
    );
    console.log(`[PrepareChatUseCase] Gateway reasoning: ${gatewayReasoning}`);

    // ── 8. Resolve agent (needed before sanitization to know valid tools) ─
    const agent = AGENTS[agentType] ?? triageNurseAgent;

    // ── 9. Sanitize messages ──────────────────────────────────────────────
    const sanitizedMessages = sanitizeMessagesForAgent(messages, agent);
    console.log(
      `[PrepareChatUseCase] Routing to ${agentType.toUpperCase()} agent`,
    );

    // ── 10. Build options ─────────────────────────────────────────────────
    const options = buildAgentOptions({
      userId,
      profileId,
      userQuery: ctx.userQuery,
      sessionId,
      hasAttachment: ctx.hasAttachment,
      profile,
      thinkingLevel,
      needsRag,
      preContext,
      responseMode,
    });

    return {
      agent,
      sanitizedMessages,
      messages,
      options,
      agentType,
      loadingHints,
      sessionId,
      ctx,
      gatewayReasoning,
      directResponse,
      toolOutputMerge,
    };
  }
}
