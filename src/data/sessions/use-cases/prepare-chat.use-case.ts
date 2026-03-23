import { isToolUIPart, safeValidateUIMessages, getToolName } from "ai";
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
  dependentId: z.string().min(1).optional(),
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
    const { userId, profileId, dependentId, body } = input;

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
        const toolOutputs = new Map(
          incomingMessage.parts
            .filter((p) => isToolUIPart(p) && p.state === "output-available")
            .map((p) => [isToolUIPart(p) ? p.toolCallId : "", p]),
        );
        if (toolOutputs.size > 0) {
          history[existingIdx] = {
            ...history[existingIdx],
            parts: history[existingIdx].parts.map((p) => {
              if (!isToolUIPart(p)) return p;
              return toolOutputs.get(p.toolCallId) ?? p;
            }),
          };
          toolOutputMerge = {
            messageId: history[existingIdx].id,
            content: JSON.stringify(history[existingIdx].parts),
          };
        }
        messages = history;
      } else if (incomingMessage.role === "assistant") {
        // Tool-output auto-send: the SDK-generated message ID won't match
        // any Firestore doc ID. Find the last assistant in history instead.
        const lastAsstIdx = history.findLastIndex(
          (m) => m.role === "assistant",
        );
        if (lastAsstIdx >= 0) {
          const toolOutputs = new Map(
            incomingMessage.parts
              .filter((p) => isToolUIPart(p) && p.state === "output-available")
              .map((p) => [isToolUIPart(p) ? p.toolCallId : "", p]),
          );
          if (toolOutputs.size > 0) {
            history[lastAsstIdx] = {
              ...history[lastAsstIdx],
              parts: history[lastAsstIdx].parts.map((p) => {
                if (!isToolUIPart(p)) return p;
                return toolOutputs.get(p.toolCallId) ?? p;
              }),
            };
            toolOutputMerge = {
              messageId: history[lastAsstIdx].id,
              content: JSON.stringify(history[lastAsstIdx].parts),
            };
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
    console.log(
      `[PrepareChatUseCase] Context extraction: ${(performance.now() - ctxStart).toFixed(0)}ms`,
    );

    // ── 4. Resolve sessionId ─────────────────────────────────────────────────
    const sessionId = body.sessionId || crypto.randomUUID();

    // ── 5. Gateway routing ────────────────────────────────────────────────
    const gatewayStart = performance.now();
    const recentMessages = messages
      .filter((m) => m.role === "user")
      .slice(-4)
      .map((m) => m.parts.find((p) => p.type === "text"))
      .filter((p): p is { type: "text"; text: string } => p?.type === "text")
      .map((p) => p.text);

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

    const gatewayDecision = await gatewayAgent.decide({
      userQuery: ctx.userQuery,
      hasAttachment: ctx.hasAttachment,
      recentMessages: recentMessages.length > 1 ? recentMessages : undefined,
      userId,
      sessionId,
      lastAgentType,
    });

    const agentType = gatewayDecision.agent;

    // ── 6. Prefetch context (guardrail + credit + memory + RAG) ───────────
    // Runs all expensive operations once before the agent streams.
    // Throws GuardrailError or CreditsExhaustedError (handled by WithContext).
    const preContext: PreRunContext = await prefetchContext({
      userId,
      profileId,
      dependentId,
      userQuery: ctx.userQuery,
      needsRag: gatewayDecision.needsRag,
      hasAttachment: ctx.hasAttachment,
    });

    console.log(
      `[PrepareChatUseCase] Gateway + prefetch: ${agentType} (thinking: ${gatewayDecision.thinkingLevel}, rag: ${gatewayDecision.needsRag}, ${(performance.now() - gatewayStart).toFixed(0)}ms)`,
    );
    console.log(
      `[PrepareChatUseCase] Gateway reasoning: ${gatewayDecision.reasoning}`,
    );

    // ── 7. Resolve agent (needed before sanitization to know valid tools) ─
    const agent = AGENTS[agentType] ?? triageNurseAgent;

    // ── 8. Sanitize messages ──────────────────────────────────────────────
    // Strip incomplete tool invocations AND tool parts for tools not in the
    // selected agent's toolset (e.g. submitDailyPlan parts when routing to
    // clinical agent after a diet planner conversation).
    const agentToolNames = new Set(Object.keys(agent.tools ?? {}));
    // eslint-disable-next-line max-lines-per-function
    const sanitizedMessages: UIMessage[] = messages.map((m) => {
      if (m.role !== "assistant") return m;
      const needsFilter = m.parts.some(
        (p) =>
          isToolUIPart(p) &&
          (p.state === "input-available" ||
            p.state === "approval-requested" ||
            !agentToolNames.has(getToolName(p))),
      );
      if (!needsFilter) return m;
      return {
        ...m,
        parts: m.parts.filter(
          (p) =>
            !isToolUIPart(p) ||
            (p.state !== "input-available" &&
              p.state !== "approval-requested" &&
              agentToolNames.has(getToolName(p))),
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
      dependentId,
      userQuery: ctx.userQuery,
      sessionId,
      hasAttachment: ctx.hasAttachment,
      queryEmbedding: preContext.queryEmbedding,
      thinkingLevel: gatewayDecision.thinkingLevel,
      needsRag: gatewayDecision.needsRag,
      preContext,
    };

    const loadingHints = gatewayDecision.loadingHints;

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
