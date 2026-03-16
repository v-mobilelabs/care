import { isToolUIPart, safeValidateUIMessages } from "ai";
import type { UIMessage, Agent, ToolSet } from "ai";
import { z } from "zod";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { ApiError } from "@/lib/api/with-context";
import { extractMessageContext } from "@/lib/chat/helpers";
import type { MessageContext } from "@/lib/chat/helpers";
import { getLoadingHint } from "@/lib/chat/loading-hints";
import {
  clinicalAgent,
  dietPlannerChatAgent,
  prescriptionChatAgent,
  bloodTestChatAgent,
  gatewayAgent,
} from "@/data/shared/service/agents";
import type { AgentCallOptions } from "@/data/shared/service/agents/base/agent";
import type { AgentType } from "@/data/shared/service/agents";
import { ragService } from "@/data/shared/service/rag/rag.service";

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
  loadingHint: string;
  sessionId: string;
  ctx: MessageContext;
}

// ── Use case ──────────────────────────────────────────────────────────────────

const AGENTS = {
  clinical: clinicalAgent,
  dietPlanner: dietPlannerChatAgent,
  prescription: prescriptionChatAgent,
  bloodTest: bloodTestChatAgent,
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

    // ── 1. Validate & parse messages ──────────────────────────────────────
    const validationResult = await safeValidateUIMessages({
      messages: body.messages,
    });
    if (!validationResult.success || !validationResult.data.length) {
      throw ApiError.badRequest("messages is required.");
    }
    const messages: UIMessage[] = validationResult.data;

    // ── 2. Extract message context ────────────────────────────────────────
    const ctxStart = performance.now();
    const ctx = extractMessageContext(messages, body.attachmentUrls);
    console.log(
      `[PrepareChatUseCase] Context extraction: ${(performance.now() - ctxStart).toFixed(0)}ms`,
    );

    // ── 3. Resolve sessionId ──────────────────────────────────────────────
    const sessionId = body.sessionId ?? crypto.randomUUID();

    // ── 4. Gateway routing ────────────────────────────────────────────────
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

    // ── 5. Conditionally embed (only when RAG is needed) ──────────────────
    let queryEmbedding: number[] | undefined;
    if (gatewayDecision.needsRag) {
      queryEmbedding = await ragService.embedQuery(ctx.userQuery);
    }

    console.log(
      `[PrepareChatUseCase] Gateway + embed: ${agentType} (confidence: ${gatewayDecision.confidence}, thinking: ${gatewayDecision.thinkingLevel}, rag: ${gatewayDecision.needsRag}, ${(performance.now() - gatewayStart).toFixed(0)}ms)`,
    );
    console.log(
      `[PrepareChatUseCase] Gateway reasoning: ${gatewayDecision.reasoning}`,
    );

    // ── 6. Sanitize messages (strip incomplete tool invocations) ──────────
    const sanitizedMessages: UIMessage[] = messages.map((m) => {
      if (m.role !== "assistant") return m;
      const hasIncomplete = m.parts.some(
        (p) =>
          isToolUIPart(p) &&
          (p.state === "input-available" || p.state === "approval-requested"),
      );
      if (!hasIncomplete) return m;
      return {
        ...m,
        parts: m.parts.filter(
          (p) =>
            !isToolUIPart(p) ||
            (p.state !== "input-available" && p.state !== "approval-requested"),
        ),
      };
    });

    // ── 7. Resolve agent ──────────────────────────────────────────────────
    const agent = AGENTS[agentType as keyof typeof AGENTS] ?? clinicalAgent;
    console.log(
      `[PrepareChatUseCase] Routing to ${agentType.toUpperCase()} agent`,
    );

    // ── 8. Build options ──────────────────────────────────────────────────
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

    const loadingHint = getLoadingHint(ctx.userQuery);

    return {
      agent,
      sanitizedMessages,
      messages,
      options,
      agentType,
      loadingHint,
      sessionId,
      ctx,
    };
  }
}
