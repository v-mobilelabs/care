import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  createAgentUIStream,
  createIdGenerator,
  consumeStream,
} from "ai";
import { after } from "next/server";
import { revalidateTag } from "next/cache";
import { WithContext } from "@/lib/api/with-context";
import {
  AddMessageUseCase,
  PrepareChatUseCase,
  SetSessionAgentUseCase,
  messageRepository,
} from "@/data/sessions";
import { CreateAssessmentUseCase } from "@/data/assessments";
import { CacheTags } from "@/data/cached";
import {
  extractAndSaveMemories,
  extractTextFromParts,
} from "@/data/memory/service/extract-memories";
import { CreditsExhaustedError, GuardrailError } from "@/lib/errors";
import { contextCacheService } from "@/data/shared/service/context-cache.service";

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
  question: string;
  questionType: string;
  options?: string[];
  answer: string;
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
  if (typeof part.output !== "string" || part.output.trim().length === 0)
    return null;

  const input = (part.input ?? part.args ?? {}) as AskQuestionInputPayload;
  if (!input.question || !input.type) return null;

  const options = getOptionalOptions(input.options);
  return {
    question: input.question,
    questionType: input.type,
    ...(options ? { options } : {}),
    answer: part.output,
  };
}

function extractAnsweredQaPairs(parts: unknown[]) {
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

async function syncAssessmentsFromAssistantParts(args: {
  userId: string;
  sessionId: string;
  specialtyAgent?: string;
  parts: unknown[];
}) {
  const starts = extractStarts(args.parts);
  const qa = extractAnsweredQaPairs(args.parts);
  const actionCards = extractActionCards(args.parts);
  if (starts.length === 0 && qa.length === 0 && actionCards.length === 0)
    return;

  let activeRunId: string | undefined;
  let latestTitle = "Clinical Assessment";
  let latestCondition: string | undefined;
  let latestGuideline: string | undefined;
  let latestEstimatedQuestions: number | undefined;
  let latestEstimatedMinutes: string | undefined;

  for (const start of starts) {
    latestTitle = start.title;
    latestCondition = start.condition;
    latestGuideline = start.guideline;
    latestEstimatedQuestions = start.estimatedQuestions;
    latestEstimatedMinutes = start.estimatedMinutes;
    const saved = await new CreateAssessmentUseCase().execute({
      userId: args.userId,
      sessionId: args.sessionId,
      ...(start.runId ? { runId: start.runId } : {}),
      specialtyAgent: args.specialtyAgent,
      title: start.title,
      condition: start.condition,
      guideline: start.guideline,
      guidelinesFollowed: start.guideline ? [start.guideline] : undefined,
      estimatedQuestions: start.estimatedQuestions,
      estimatedMinutes: start.estimatedMinutes,
      status: "active",
      startedAt: new Date().toISOString(),
      qa: [],
    });
    activeRunId = saved.runId ?? start.runId;
  }

  if (qa.length > 0 || actionCards.length > 0) {
    await new CreateAssessmentUseCase().execute({
      userId: args.userId,
      sessionId: args.sessionId,
      ...(activeRunId ? { runId: activeRunId } : {}),
      specialtyAgent: args.specialtyAgent,
      title: latestTitle,
      condition: latestCondition,
      guideline: latestGuideline,
      guidelinesFollowed: latestGuideline ? [latestGuideline] : undefined,
      estimatedQuestions: latestEstimatedQuestions,
      estimatedMinutes: latestEstimatedMinutes,
      status: "active",
      actionCards,
      qa,
    });
  }
}

// Increased from 60s to 180s to support complex tool executions like dietPlanTool
// which generates 35+ detailed meal entries with nutrition data
export const maxDuration = 180;

export const POST = WithContext(
  // eslint-disable-next-line max-lines-per-function
  async ({ user, profileId, req }) => {
    console.log("[Chat API] Request started");

    const body = await req.json();
    const isUserTurn = body?.message?.role === "user";

    // ── Prepare: validate, route, sanitize ─────────────────────────────────
    const {
      agent,
      sanitizedMessages,
      messages,
      options,
      agentType,
      loadingHints,
      sessionId,
      ctx,
      toolOutputMerge,
    } = await new PrepareChatUseCase().execute({
      userId: user.uid,
      profileId,
      body,
    });

    // Capture response parts and usage for Firestore persistence.
    let persistPayload: {
      responseParts: unknown[];
      userContent: string;
      /** Firestore doc ID of the continued assistant message (tool-output auto-send). */
      continuationMessageId?: string;
    } | null = null;

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let zeroOutputSteps = 0;

    // Schedule Firestore persistence via after() — the response is sent immediately
    // without blocking on DB writes. Next.js after() keeps the serverless function
    // alive until the task finishes, so writes are guaranteed to complete.
    // eslint-disable-next-line max-lines-per-function
    after(async () => {
      // Persist user message only for real user turns. Auto-submit cycles
      // (tool outputs / approvals) send assistant messages and must not create
      // duplicate user entries.
      if (isUserTurn) {
        try {
          await new AddMessageUseCase().execute({
            userId: user.uid,
            profileId,
            sessionId,
            title: ctx.title,
            role: "user",
            content:
              ctx.storableParts.length > 0
                ? JSON.stringify(ctx.storableParts)
                : ctx.userQuery,
          });
        } catch (saveError) {
          console.error("[Chat API] Failed to save user message:", saveError);
        }
      }

      // Only save the assistant message if we captured a response (onFinish
      // fires with finishReason:"abort" and empty parts on early disconnect).
      if (!persistPayload) {
        console.warn(
          "[Chat API] after(): no assistant response captured (client disconnected early)",
        );
        return;
      }
      const capturedUsage =
        totalInputTokens > 0 || totalOutputTokens > 0
          ? {
              promptTokens: totalInputTokens,
              completionTokens: totalOutputTokens,
              totalTokens: totalInputTokens + totalOutputTokens,
            }
          : undefined;
      if (capturedUsage) {
        console.log(
          `[Chat API] Agent usage — Input: ${capturedUsage.promptTokens}, Output: ${capturedUsage.completionTokens}`,
        );
      }
      try {
        if (persistPayload.continuationMessageId) {
          // Tool-output auto-send: update the existing assistant message
          // with the complete parts (old + new) from the SDK continuation.
          console.log(
            "[Chat API] Updating existing assistant message (continuation)...",
          );
          await messageRepository.updateContent(
            user.uid,
            profileId,
            sessionId,
            persistPayload.continuationMessageId,
            JSON.stringify(persistPayload.responseParts),
            capturedUsage,
          );
        } else {
          console.log("[Chat API] Saving assistant message to Firestore...");
          await new AddMessageUseCase().execute({
            userId: user.uid,
            profileId,
            sessionId,
            role: "assistant",
            content: JSON.stringify(persistPayload.responseParts),
            ...(capturedUsage && { usage: capturedUsage }),
            agentType,
          });
        }
        console.log("[Chat API] Assistant message saved successfully");

        await syncAssessmentsFromAssistantParts({
          userId: user.uid,
          sessionId,
          specialtyAgent: agentType,
          parts: persistPayload.responseParts,
        });
      } catch (saveError) {
        console.error(
          "[Chat API] Failed to save assistant message:",
          saveError,
        );
      }

      // Bust server-side caches so the next SSR render reflects mutations.
      revalidateTag(CacheTags.usage(user.uid), "seconds");
      revalidateTag(CacheTags.sessions(user.uid), "seconds");
      revalidateTag(CacheTags.assessments(user.uid), "minutes");
      revalidateTag(CacheTags.medications(user.uid), "minutes");

      // Persist the agent type on the session for cross-worker routing affinity.
      try {
        // Triage can handoff to a specialist during the tool loop.
        // Do not overwrite that handoff at the end of the request.
        if (agentType !== "triageNurse") {
          await new SetSessionAgentUseCase().execute({
            userId: user.uid,
            profileId,
            sessionId,
            agentType,
          });
        }
      } catch (agentErr) {
        console.error(
          "[Chat API] Failed to persist session agent type:",
          agentErr,
        );
      }

      // Auto-extract memorable facts from the conversation (like Mem0's addMemories).
      try {
        await extractAndSaveMemories({
          userId: user.uid,
          profileId,
          sessionId,
          userMessage: ctx.userQuery,
          assistantMessage: extractTextFromParts(persistPayload.responseParts),
        });
      } catch (memErr) {
        console.error("[Chat API] Memory extraction failed:", memErr);
      }
    });

    // ── Stream: write progress parts, then merge the agent stream ───────────
    function handleStepFinish(stepResult: {
      usage?: { inputTokens?: number; outputTokens?: number };
    }) {
      if (stepResult.usage) {
        totalInputTokens += stepResult.usage.inputTokens ?? 0;
        const stepOutput = stepResult.usage.outputTokens ?? 0;
        totalOutputTokens += stepOutput;
        if (stepOutput === 0) zeroOutputSteps++;
      }
    }

    function handleStreamError(error: unknown): string {
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

    const generateMessageId = createIdGenerator({ prefix: "msg", size: 16 });

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        writer.write({
          type: "data-progress",
          data: { stage: "Preparing your response…", loadingHints, agentType },
          transient: true,
        });

        // Write a start part with a server-generated message ID for user turns.
        // For tool-output auto-sends (non-user turns) we skip this so the
        // client SDK's continuation behavior works — it keeps the existing
        // assistant message ID and replaces (not pushes) the message.
        if (isUserTurn) {
          writer.write({
            type: "start",
            messageId: generateMessageId(),
          });
        }

        const agentStream = await createAgentUIStream({
          agent,
          uiMessages: sanitizedMessages,
          options,
          abortSignal: req.signal,
          sendStart: false,
          originalMessages: messages as Parameters<
            typeof createAgentUIStream
          >[0]["originalMessages"],
          generateMessageId,
          onStepFinish: handleStepFinish,
          onFinish: ({ responseMessage, finishReason }) => {
            const storableParts = responseMessage.parts.filter(
              (p: { type: string }) => p.type !== "step-start",
            );
            // Only persist if the response has meaningful content — step-start
            // parts are always present even when the model returns 0 tokens.
            const hasMeaningfulContent = storableParts.some(
              (p: { type: string; text?: string }) =>
                (p.type === "text" &&
                  typeof p.text === "string" &&
                  p.text.trim().length > 0) ||
                p.type.startsWith("tool-"),
            );

            const isContinuationTurn = !isUserTurn && Boolean(toolOutputMerge);
            const continuationHasDelta = !isContinuationTurn
              ? true
              : hasPartsDelta(
                  parseStoredParts(toolOutputMerge?.content),
                  storableParts,
                );

            if (hasMeaningfulContent && continuationHasDelta) {
              persistPayload = {
                responseParts: storableParts,
                userContent:
                  ctx.storableParts.length > 0
                    ? JSON.stringify(ctx.storableParts)
                    : ctx.userQuery,
                // When the server used continuation (tool-output auto-send),
                // responseMessage.id is the Firestore doc ID of the existing
                // assistant message. We update it in-place instead of adding.
                continuationMessageId:
                  !isUserTurn && toolOutputMerge
                    ? toolOutputMerge.messageId
                    : undefined,
              };
            } else {
              const emptyReason = !hasMeaningfulContent
                ? "no meaningful parts"
                : "no continuation delta";
              const previousParts = parseStoredParts(toolOutputMerge?.content);
              console.warn(
                `[Chat API] Empty model response (${emptyReason}). finishReason: ${finishReason}, ` +
                  `totalOutput: ${totalOutputTokens}, zeroOutputSteps: ${zeroOutputSteps}`,
              );
              console.warn(
                `[Chat API] Continuation diagnostics: isContinuation=${isContinuationTurn}, ` +
                  `prevParts=${previousParts.length}, newParts=${storableParts.length}, ` +
                  `hasMeaningfulContent=${hasMeaningfulContent}, hasDelta=${continuationHasDelta}`,
              );
              // Invalidate the context cache for this agent — a stale cache may
              // have caused the model to produce no output.
              contextCacheService.invalidate(agentType);
              // Signal the client so it can show a retry prompt.
              writer.write({
                type: "data-error",
                data: {
                  code: "empty_response",
                  message:
                    "The AI returned an empty response. Please try again.",
                },
                transient: true,
              });
            }
            // Send token usage to the client as a custom stream part.
            if (totalInputTokens > 0 || totalOutputTokens > 0) {
              writer.write({
                type: "data-usage",
                data: {
                  inputTokens: totalInputTokens,
                  outputTokens: totalOutputTokens,
                },
                transient: true,
              });
            }
          },
        });

        writer.merge(agentStream);
      },
      onError: handleStreamError,
    });

    return createUIMessageStreamResponse({
      stream,
      headers: { "X-Session-Id": sessionId },
      // Consume the SSE stream on the server so the LLM runs to completion
      // and onFinish fires even when the client disconnects mid-stream.
      consumeSseStream: ({ stream: sseStream }) => {
        consumeStream({
          stream: sseStream,
          onError: (e) => console.error("[Chat API] consumeStream error:", e),
        });
      },
    });
  },
);
