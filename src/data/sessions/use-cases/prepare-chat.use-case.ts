import { isToolUIPart, safeValidateUIMessages, getToolName } from "ai";
import type { UIMessage, Agent, ToolSet } from "ai";
import { z } from "zod";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { ApiError } from "@/lib/api/with-context";
import { extractMessageContext } from "@/lib/chat/helpers";
import type { MessageContext } from "@/lib/chat/helpers";
import {
  clinicalAgent,
  dietPlannerChatAgent,
  prescriptionChatAgent,
  labReportChatAgent,
  patientAgent,
  gatewayAgent,
} from "@/data/shared/service/agents";
import type { AgentCallOptions } from "@/data/shared/service/agents/base/agent";
import type { AgentType } from "@/data/shared/service/agents";
import { ragService } from "@/data/shared/service/rag/rag.service";
import { messageRepository } from "../repositories/message.repository";
import { toUIMessage } from "../models/message.model";

// ── Input schema ──────────────────────────────────────────────────────────────

const PrepareChatSchema = z.object({
  userId: z.string().min(1),
  profileId: z.string().min(1),
  dependentId: z.string().min(1).optional(),
  body: z.object({
    messages: z.unknown(),
    sessionId: z.string().optional(),
    attachmentUrls: z
      .array(z.object({ url: z.string(), mediaType: z.string() }))
      .optional(),
  }),
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
}

// ── Use case ──────────────────────────────────────────────────────────────────

const AGENTS = {
  clinical: clinicalAgent,
  dietPlanner: dietPlannerChatAgent,
  prescription: prescriptionChatAgent,
  labReport: labReportChatAgent,
  patient: patientAgent,
} as const;

export class PrepareChatUseCase extends UseCase<
  PrepareChatInput,
  PrepareChatResult
> {
  static validate(input: unknown): PrepareChatInput {
    return PrepareChatSchema.parse(input);
  }

  protected async run(input: PrepareChatInput): Promise<PrepareChatResult> {
    const { userId, profileId, dependentId, body } = input;

    // ── 1. Validate & parse incoming message(s) ────────────────────────────
    // The client sends only the latest message (server-managed persistence).
    // We load the full conversation history from Firestore and prepend it.
    const validationResult = await safeValidateUIMessages({
      messages: body.messages,
    });
    if (!validationResult.success || !validationResult.data.length) {
      throw ApiError.badRequest("messages is required.");
    }
    const incomingMessages: UIMessage[] = validationResult.data;

    // ── 2. Load history from Firestore (existing sessions only) ──────────────
    let messages: UIMessage[] = incomingMessages;
    if (body.sessionId) {
      const historyDtos = await messageRepository.listAllForSession(
        userId,
        profileId,
        body.sessionId,
      );
      if (historyDtos.length > 0) {
        messages = [...historyDtos.map(toUIMessage), ...incomingMessages];
      }
    }

    // ── 3. Extract message context ────────────────────────────────────────
    const ctxStart = performance.now();
    const ctx = extractMessageContext(messages, body.attachmentUrls);
    console.log(
      `[PrepareChatUseCase] Context extraction: ${(performance.now() - ctxStart).toFixed(0)}ms`,
    );

    // ── 4. Resolve sessionId ─────────────────────────────────────────────────
    const sessionId = body.sessionId ?? crypto.randomUUID();

    // ── 5. Gateway routing ────────────────────────────────────────────────
    const gatewayStart = performance.now();
    const recentMessages = messages
      .filter((m) => m.role === "user")
      .slice(-4)
      .map((m) => m.parts.find((p) => p.type === "text"))
      .filter((p): p is { type: "text"; text: string } => p?.type === "text")
      .map((p) => p.text);

    const gatewayDecision = await gatewayAgent.decide({
      userQuery: ctx.userQuery,
      hasAttachment: ctx.hasAttachment,
      recentMessages: recentMessages.length > 1 ? recentMessages : undefined,
      userId,
      sessionId,
    });

    const agentType = gatewayDecision.agent;

    // ── 6. Conditionally embed (only when RAG is needed) ──────────────────
    let queryEmbedding: number[] | undefined;
    if (gatewayDecision.needsRag) {
      queryEmbedding = await ragService.embedQuery(ctx.userQuery);
    }

    console.log(
      `[PrepareChatUseCase] Gateway + embed: ${agentType} (thinking: ${gatewayDecision.thinkingLevel}, rag: ${gatewayDecision.needsRag}, ${(performance.now() - gatewayStart).toFixed(0)}ms)`,
    );
    console.log(
      `[PrepareChatUseCase] Gateway reasoning: ${gatewayDecision.reasoning}`,
    );

    // ── 7. Resolve agent (needed before sanitization to know valid tools) ─
    const agent = AGENTS[agentType as keyof typeof AGENTS] ?? clinicalAgent;

    // ── 8. Sanitize messages ──────────────────────────────────────────────
    // Strip incomplete tool invocations AND tool parts for tools not in the
    // selected agent's toolset (e.g. submitDailyPlan parts when routing to
    // clinical agent after a diet planner conversation).
    const agentToolNames = new Set(Object.keys(agent.tools ?? {}));
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
      queryEmbedding,
      thinkingLevel: gatewayDecision.thinkingLevel,
      needsRag: gatewayDecision.needsRag,
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
    };
  }
}
