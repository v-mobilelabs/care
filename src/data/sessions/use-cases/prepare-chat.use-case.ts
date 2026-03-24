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
  gatewayAgent,
  triageNurseAgent,
} from "@/data/shared/service/agents";
import type { AgentCallOptions } from "@/data/shared/service/agents/base/agent";
import type { AgentType } from "@/data/shared/service/agents";
import { prefetchContext } from "@/data/shared/service/middleware/pre-run";
import type { PreRunContext } from "@/data/shared/service/middleware/pre-run";
import { messageRepository } from "../repositories/message.repository";
import { sessionRepository } from "../repositories/session.repository";
import { toUIMessage } from "../models/message.model";

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
      agentOverride: z.string().optional(),
      attachmentUrls: z
        .array(z.object({ url: z.string(), mediaType: z.string() }))
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

type ToolOutputPart = UIMessage["parts"][number] & {
  state: "output-available";
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
): ToolOutputPart[] {
  return parts.filter(
    (p): p is ToolOutputPart =>
      isToolPartLike(p) && p.state === "output-available",
  );
}

function mergeToolOutputsIntoAssistantParts(
  targetParts: UIMessage["parts"],
  incomingToolOutputs: ToolOutputPart[],
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
    const result: ReportHandoffSignal = {
      nextSpecialist: nextSpecialistRaw.trim(),
      autoRoute: true,
      reason: typeof reasonRaw === "string" ? reasonRaw : undefined,
      reportLabel:
        typeof reportLabelRaw === "string" ? reportLabelRaw : undefined,
    };

    console.log(`[readReportHandoffFromPart] Found: ${JSON.stringify(result)}`);
    return result;
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

  const result: ReportHandoffSignal = {
    nextSpecialist: nextSpecialistRaw.trim(),
    autoRoute: typeof autoRouteRaw === "boolean" ? autoRouteRaw : true,
    reason: typeof reasonRaw === "string" ? reasonRaw : undefined,
    reportLabel:
      typeof reportLabelRaw === "string" ? reportLabelRaw : undefined,
  };

  console.log(`[readReportHandoffFromPart] Found: ${JSON.stringify(result)}`);
  return result;
}

function findLatestReportHandoff(
  messages: ReadonlyArray<UIMessage>,
): ReportHandoffSignal | undefined {
  console.log(
    `[findLatestReportHandoff] Searching through ${messages.length} messages`,
  );
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    console.log(
      `[findLatestReportHandoff] Checking message ${i}: role=${message.role}, parts=${message.parts.length}`,
    );
    if (message.role !== "assistant") continue;

    for (let j = message.parts.length - 1; j >= 0; j -= 1) {
      const part = message.parts[j];
      console.log(
        `[findLatestReportHandoff] Checking part ${j}: type=${(part as { type?: string }).type}`,
      );
      const handoff = readReportHandoffFromPart(part);
      if (handoff && handoff.autoRoute) {
        console.log(
          `[PrepareChatUseCase] Found report handoff: nextSpecialist=${handoff.nextSpecialist}, reason=${handoff.reason}, label=${handoff.reportLabel}`,
        );
        return handoff;
      }
    }
  }
  console.log("[findLatestReportHandoff] No handoff found in any message");
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
  /** When tool outputs are merged into an existing DB assistant message. */
  toolOutputMerge?: { messageId: string; content: string };
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

  // eslint-disable-next-line max-lines-per-function
  protected async run(input: PrepareChatInput): Promise<PrepareChatResult> {
    const { userId, profileId, body } = input;

    // ── 1. Validate the single incoming message ────────────────────────────
    // The client sends only the latest message (server-managed persistence).
    // We load the full conversation history from Firestore and prepend it.
    const validationResult = await safeValidateUIMessages({
      messages: [body.message],
    });
    if (!validationResult.success || !validationResult.data.length) {
      throw ApiError.badRequest("message is required.");
    }
    const incomingMessage: UIMessage = {
      ...validationResult.data[0],
      // Strip step-start boundaries before model processing. These are
      // structural UI markers for multi-step rendering, not semantic content.
      parts: validationResult.data[0].parts.filter(
        (p) => p.type !== "step-start",
      ),
    };

    // ── 2. Load history from Firestore and append incoming message ────────────
    let toolOutputMerge: { messageId: string; content: string } | undefined;
    let messages: UIMessage[];
    if (body.sessionId) {
      const historyDtos = await messageRepository.listAllForSession(
        userId,
        profileId,
        body.sessionId,
      );
      const history =
        historyDtos.length > 0 ? historyDtos.map(toUIMessage) : [];

      // Deduplicate: if the incoming message ID exists in history
      // (e.g. assistant message with tool outputs from auto-send), merge
      // tool output parts into the history version.
      const existingIdx = history.findIndex((m) => m.id === incomingMessage.id);
      if (existingIdx >= 0) {
        const incomingToolOutputs = collectOutputAvailableToolParts(
          incomingMessage.parts,
        );
        if (incomingToolOutputs.length > 0) {
          const mergeResult = mergeToolOutputsIntoAssistantParts(
            history[existingIdx].parts,
            incomingToolOutputs,
          );
          console.log(
            `[PrepareChatUseCase] Merge(existing assistant): incoming=${incomingToolOutputs.length}, byId=${mergeResult.mergedById}, fallback=${mergeResult.mergedByFallback}, unresolved=${mergeResult.unresolved}`,
          );
          // Capture the merged content for Firestore persistence, then replace
          // the history slot with the live SDK-structured incomingMessage so the
          // model sees a fresh "tool output just arrived" signal (not a plain-JSON
          // DB reconstruction which loses SDK runtime metadata).
          toolOutputMerge = {
            messageId: history[existingIdx].id,
            content: JSON.stringify(mergeResult.mergedParts),
          };
          history[existingIdx] = incomingMessage;
        }
        messages = history;
      } else if (incomingMessage.role === "assistant") {
        // Tool-output auto-send: the SDK-generated message ID won't match
        // any Firestore doc ID. Find the last assistant in history instead.
        const lastAsstIdx = history.findLastIndex(
          (m) => m.role === "assistant",
        );
        if (lastAsstIdx >= 0) {
          const incomingToolOutputs = collectOutputAvailableToolParts(
            incomingMessage.parts,
          );
          if (incomingToolOutputs.length > 0) {
            const mergeResult = mergeToolOutputsIntoAssistantParts(
              history[lastAsstIdx].parts,
              incomingToolOutputs,
            );
            console.log(
              `[PrepareChatUseCase] Merge(last assistant): incoming=${incomingToolOutputs.length}, byId=${mergeResult.mergedById}, fallback=${mergeResult.mergedByFallback}, unresolved=${mergeResult.unresolved}`,
            );
            // Capture merged content for persistence; replace slot with the live
            // SDK-structured incomingMessage for correct model continuation.
            toolOutputMerge = {
              messageId: history[lastAsstIdx].id,
              content: JSON.stringify(mergeResult.mergedParts),
            };
            history[lastAsstIdx] = incomingMessage;
          }
          messages = history;
        } else {
          messages = [...history, incomingMessage];
        }
      } else {
        messages = [...history, incomingMessage];
      }
    } else {
      messages = [incomingMessage];
    }

    // ── 3. Extract message context ────────────────────────────────────────
    const ctxStart = performance.now();
    const ctx = extractMessageContext(messages, body.attachmentUrls);

    // On continuation turns (tool-output auto-send), the last "user" message
    // is a stale query from the original turn. Override userQuery with the
    // actual content that was just answered so gateway routing + RAG are
    // semantically current.
    if (incomingMessage.role === "assistant") {
      const answeredParts = collectOutputAvailableToolParts(
        incomingMessage.parts,
      );
      if (answeredParts.length > 0) {
        const qaPairs = answeredParts
          .map((p) => {
            const tPart = p as ToolPartLike;
            const input = asObject(tPart.input);
            const output = asObject(tPart.output);
            const toolName = getToolPartName(p);
            if (toolName === "askQuestion") {
              const q = typeof input?.question === "string" ? input.question : "";
              const a = typeof output?.answer === "string" ? output.answer : JSON.stringify(output);
              return q ? `Question: ${q}\nAnswer: ${a}` : null;
            }
            return null;
          })
          .filter(Boolean);
        if (qaPairs.length > 0) {
          ctx.userQuery = qaPairs.join("\n\n");
        }
      }
    }

    console.log(
      `[PrepareChatUseCase] Context extraction: ${(performance.now() - ctxStart).toFixed(0)}ms`,
    );

    // ── 4. Resolve sessionId ─────────────────────────────────────────────────
    const sessionId = body.sessionId || crypto.randomUUID();

    // ── 5. Gateway routing ────────────────────────────────────────────────
    const gatewayStart = performance.now();
    const isContinuationTurn = incomingMessage.role === "assistant";

    // Load persisted agent type for cross-worker session affinity
    let lastAgentType: string | undefined;
    if (body.sessionId) {
      const session = await sessionRepository.findById(
        userId,
        profileId,
        body.sessionId,
      );
      lastAgentType = session?.lastAgentType;
    }

    // Fast-path: continuation turns (askQuestion answers) stay with the same
    // specialist. Skip gateway LLM routing, skip RAG (answer context is
    // already in the conversation), use low thinking (acknowledge + next Q).
    let agentType: AgentType;
    let needsRag: boolean;
    let thinkingLevel: "low" | "medium" | "high";
    let gatewayReasoning: string;
    let loadingHints: string[];

    if (isContinuationTurn && lastAgentType) {
      agentType = lastAgentType as AgentType;
      needsRag = false;
      thinkingLevel = "low";
      gatewayReasoning = "continuation-fast-path";
      loadingHints = ["Continuing assessment..."];
      console.log(
        `[PrepareChatUseCase] Continuation fast-path → ${agentType} (skip gateway + RAG)`,
      );
    } else {
      const recentMessages = messages
        .filter((m) => m.role === "user")
        .slice(-4)
        .map((m) => m.parts.find((p) => p.type === "text"))
        .filter((p): p is { type: "text"; text: string } => p?.type === "text")
        .map((p) => p.text);

      const attachmentMetadata = ctx.storableParts
        .filter(
          (p) =>
            (p.type as string) === "file" || (p.type as string) === "image",
        )
        .map((p) => ({
          url: (p.url as string) ?? "",
          mediaType: (p.mediaType as string) ?? "application/octet-stream",
          fileName: (p.fileName as string | undefined) ?? undefined,
        }));

      const reportHandoff = findLatestReportHandoff(messages);

      const gatewayDecision = await gatewayAgent.decide({
        userQuery: ctx.userQuery,
        hasAttachment: ctx.hasAttachment,
        attachmentMetadata:
          attachmentMetadata.length > 0 ? attachmentMetadata : undefined,
        reportHandoff,
        recentMessages: recentMessages.length > 1 ? recentMessages : undefined,
        userId,
        sessionId,
        lastAgentType,
      });

      agentType = gatewayDecision.agent;
      needsRag = gatewayDecision.needsRag;
      thinkingLevel = gatewayDecision.thinkingLevel;
      gatewayReasoning = gatewayDecision.reasoning;
      loadingHints = gatewayDecision.loadingHints;
    }

    // ── 6. Prefetch context (guardrail + credit + memory + RAG) ───────────
    // Runs all expensive operations once before the agent streams.
    // Throws GuardrailError or CreditsExhaustedError (handled by WithContext).
    const preContext: PreRunContext = await prefetchContext({
      userId,
      profileId,
      userQuery: ctx.userQuery,
      needsRag,
      hasAttachment: ctx.hasAttachment,
    });

    console.log(
      `[PrepareChatUseCase] Gateway + prefetch: ${agentType} (thinking: ${thinkingLevel}, rag: ${needsRag}, ${(performance.now() - gatewayStart).toFixed(0)}ms)`,
    );
    console.log(
      `[PrepareChatUseCase] Gateway reasoning: ${gatewayReasoning}`,
    );

    // ── 7. Resolve agent (needed before sanitization to know valid tools) ─
    const agent = AGENTS[agentType] ?? triageNurseAgent;

    // ── 8. Sanitize messages ──────────────────────────────────────────────
    // Strip open/incomplete tool calls (input-available, approval-requested).
    // output-available parts are kept unconditionally — they are completed
    // historical context the model must see to continue correctly.
    const sanitizedMessages: UIMessage[] = messages.map((m) => {
      if (m.role !== "assistant") return m;
      // Only strip "open" tool call states (input-available, approval-requested).
      // output-available parts represent completed historical tool results and
      // must be preserved regardless of which agent is now handling the session —
      // stripping them would remove the tool answer context the model needs to
      // continue (e.g. referral confirmed → dentistry continuation).
      const needsFilter = m.parts.some(
        (p) =>
          isToolPartLike(p) &&
          (p.state === "input-available" || p.state === "approval-requested"),
      );
      if (!needsFilter) return m;
      return {
        ...m,
        parts: m.parts.filter(
          (p) =>
            !isToolPartLike(p) ||
            (p.state !== "input-available" && p.state !== "approval-requested"),
        ),
      };
    });
    console.log(
      `[PrepareChatUseCase] Routing to ${agentType.toUpperCase()} agent`,
    );

    // ── 9. Build options ──────────────────────────────────────────────────
    const options: AgentCallOptions = {
      userId,
      profileId,
      userQuery: ctx.userQuery,
      sessionId,
      hasAttachment: ctx.hasAttachment,
      queryEmbedding: preContext.queryEmbedding,
      thinkingLevel,
      needsRag,
      preContext,
    };

    return {
      agent,
      sanitizedMessages,
      messages,
      options,
      agentType,
      loadingHints,
      sessionId,
      ctx,
      toolOutputMerge,
    };
  }
}
