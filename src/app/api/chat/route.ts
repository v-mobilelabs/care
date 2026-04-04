import {
  createAgentUIStream,
  createIdGenerator,
  createUIMessageStream,
  safeValidateUIMessages,
} from "ai";
import { WithContext } from "@/lib/api/with-context";
import {
  buildChatResponse,
  handleAgentStepFinish,
  handleAgentStreamFinish,
  handleChatStreamError,
  loadChatWorkflowResumeState,
  runChatPreparationGraph,
  scheduleChatPersistence,
  type PersistPayload,
  type StreamUsageState,
  streamDirectResponse,
} from "@/workflow/chat-api-flow.workflow";
import { runNutritionMealPlannerGraph } from "@/workflow/nutrition-meal-planner.workflow";

// ─ Helper: Detect if this is a meal plan request (parallel execution candidate) ────────────

function isMealPlanRequest(query: string): boolean {
  const mealPlanKeywords = [
    "meal plan",
    "7 day",
    "seven day",
    "weekly plan",
    "diet plan",
    "meal prep",
    "food plan",
    "eating plan",
  ];
  const lowerQuery = query.toLowerCase();
  return mealPlanKeywords.some((keyword) => lowerQuery.includes(keyword));
}

// ─ Helper: Handle parallel meal planner response ──────────────────────────────────────────

interface ParallelMealPlannerWriter {
  write(part: Record<string, unknown>): void;
}

async function handleParallelMealPlanner(
  userId: string,
  profileId: string,
  sessionId: string,
  userQuery: string,
  messages: unknown,
  ctx: { storableParts: unknown[] },
  writer: ParallelMealPlannerWriter,
): Promise<{ responseParts: unknown[]; userContent: string } | null> {
  try {
    // Track completed days for persistence
    const completedDays: Array<{ dayNumber: number; data: unknown }> = [];

    // In-order streaming buffer: days complete in arbitrary order but must
    // stream to the client as Day 1 → 2 → 3 → … → 7.
    const buffer = new Map<
      number,
      { day: number; data: { day: string; dailyTotals: { calories: number } } }
    >();
    let nextDayToFlush = 1;

    function flushBuffer() {
      while (buffer.has(nextDayToFlush)) {
        const entry = buffer.get(nextDayToFlush)!;
        buffer.delete(nextDayToFlush);

        const toolCallId = `parallel-day-${entry.day}`;
        writer.write({
          type: "tool-input-available",
          toolCallId,
          toolName: "submitDailyPlan",
          input: entry.data,
        });
        writer.write({
          type: "tool-output-available",
          toolCallId,
          output: `Day ${entry.day}: ${entry.data.day} (${Math.round(entry.data.dailyTotals.calories)} cal) — 4 meals submitted.`,
        });

        completedDays.push({ dayNumber: entry.day, data: entry.data });
        console.log(
          `[Chat API] Streamed day ${entry.day} to client (${completedDays.length}/7)`,
        );

        nextDayToFlush++;
      }
    }

    writer.write({ type: "start-step" });

    await runNutritionMealPlannerGraph({
      userId,
      profileId,
      sessionId,
      userQuery,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: messages as any,
      thinkingLevel: "low",
      onDayComplete: (dayNumber, data) => {
        buffer.set(dayNumber, { day: dayNumber, data });
        flushBuffer();
      },
    });

    writer.write({ type: "finish-step" });
    writer.write({ type: "finish", finishReason: "stop" });

    // Build persistence parts sorted by day number
    const sortedDays = completedDays.sort((a, b) => a.dayNumber - b.dayNumber);
    const responseParts = sortedDays.map(({ dayNumber, data }) => ({
      type: "tool-submitDailyPlan",
      toolCallId: `parallel-day-${dayNumber}`,
      state: "output-available",
      input: data,
      output: `Day ${dayNumber} submitted`,
    }));

    return {
      responseParts,
      userContent:
        ctx.storableParts.length > 0
          ? JSON.stringify(ctx.storableParts)
          : userQuery,
    };
  } catch (error) {
    console.error(
      "[Chat API] Parallel meal planner failed, falling back to agent:",
      error,
    );
    return null;
  }
}

// ─ Helper: Initialize chat stream (handle user turn, direct response, loading hints) ─────

interface StreamInitResult {
  shouldReturn: boolean;
  stage: string;
  remainingLoadingHints: string[];
}

async function initializeChatStream(
  writer: unknown,
  isUserTurn: boolean,
  generateMessageId: () => string,
  directResponse: unknown,
  setPersistPayload: (payload: PersistPayload) => void,
  ctx: unknown,
  loadingHints: string[],
  agentType: string,
  gatewayReasoning: unknown,
  skipProgress = false,
): Promise<StreamInitResult> {
  const writerObj = writer as unknown as { write: (obj: unknown) => void };

  if (isUserTurn) {
    writerObj.write({
      type: "start",
      messageId: generateMessageId(),
    });
  }

  if (directResponse) {
    streamDirectResponse({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      writer: writer as any,
      text: directResponse as string,
      setPersistPayload,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ctx: ctx as any,
    });
    return { shouldReturn: true, stage: "", remainingLoadingHints: [] };
  }

  if (!skipProgress) {
    const [stage, ...remainingLoadingHints] = loadingHints;
    writerObj.write({
      type: "data-progress",
      data: {
        stage: stage ?? "",
        loadingHints: remainingLoadingHints,
        agentType,
        reasoning: gatewayReasoning,
      },
      transient: true,
    });
    return { shouldReturn: false, stage: stage ?? "", remainingLoadingHints };
  }

  return { shouldReturn: false, stage: "", remainingLoadingHints: [] };
}

// ─ Helper: Write ONE meaningful post-orchestration progress event ─────────────────────────
// Converts camelCase agentType (e.g. "generalMedicine") into a human-readable
// fallback stage ("General medicine...") when loadingHints is empty (cache hits).

function writePostOrchestrationProgress(
  writer: unknown,
  agentType: string,
  loadingHints: string[],
  gatewayReasoning: unknown,
): string[] {
  const [firstHint, ...restHints] = loadingHints;
  const fallbackStage =
    firstHint ??
    agentType
      .replace(/([A-Z])/g, " $1")
      .trim()
      .toLowerCase()
      .replace(/^./, (c) => c.toUpperCase()) + "...";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (writer as any).write({
    type: "data-progress",
    data: {
      stage: fallbackStage,
      loadingHints: restHints,
      agentType,
      reasoning: gatewayReasoning,
    },
    transient: true,
  });
  return restHints;
}

function dropEmptyPartMessages(msgs: unknown[]): unknown[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (msgs as any[]).filter((msg) => {
    const parts = msg.parts;
    return !Array.isArray(parts) || parts.length > 0;
  });
}

// ─ Helper: Strip tool parts from historical assistant messages to avoid SDK schema validation ─

function stripHistoricalToolParts(msgs: unknown[]): unknown[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (msgs as any[]).map((msg) => {
    if (msg.role !== "assistant") return msg;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts = msg.parts as any[];
    if (!Array.isArray(parts)) return msg;

    const cleaned = parts.map((part) => {
      if (typeof part.type !== "string" || !part.type.startsWith("tool-")) {
        return part;
      }
      // Convert tool part to text summary so LLM still gets context
      const toolName = part.type.slice(5);
      const output =
        typeof part.output === "string"
          ? part.output
          : JSON.stringify(part.output ?? "completed");
      return { type: "text" as const, text: `[${toolName}] ${output}` };
    });

    return { ...msg, parts: cleaned };
  });
}

// ─ Helper: Execute standard agent stream ───────────────────────────────────────────────────

async function executeStandardAgentStream(
  writer: unknown,
  agent: unknown,
  sanitizedMessages: unknown[],
  options: unknown,
  req: Request,
  generateMessageId: () => string,
  usageState: unknown,
  ctx: unknown,
  isUserTurn: boolean,
  toolOutputMerge: unknown,
  agentType: string,
  messages: unknown[],
  setPersistPayload: (payload: PersistPayload | null) => void,
): Promise<void> {
  // Pre-validate messages against agent tools. If stale tool inputs from
  // history fail schema validation, fall back to text-summarised tool parts.
  // Always drop messages with empty parts (SDK requires ≥1 part per message).
  let validMessages = dropEmptyPartMessages(sanitizedMessages);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools = (agent as any).tools;
  const preCheck = await safeValidateUIMessages({
    messages: validMessages,
    tools,
  });
  if (!preCheck.success) {
    console.warn(
      "[Chat API] UIMessage pre-validation failed, stripping historical tool parts:",
      preCheck.error,
    );
    validMessages = dropEmptyPartMessages(
      stripHistoricalToolParts(validMessages),
    );
  }

  const agentStream = await createAgentUIStream({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    agent: agent as any,
    uiMessages: validMessages,
    options,
    abortSignal: req.signal,
    sendReasoning: true,
    sendStart: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    originalMessages: messages as any,
    generateMessageId,
    onStepFinish: (stepResult) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handleAgentStepFinish(usageState as any, stepResult),
    onFinish: (finishPayload) => {
      handleAgentStreamFinish({
        finishPayload,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ctx: ctx as any,
        isUserTurn,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        toolOutputMerge: toolOutputMerge as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        usageState: usageState as any,
        agentType,
        setPersistPayload,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        writer: writer as any,
      });
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (writer as any).merge(agentStream);
}

// eslint-disable-next-line max-lines-per-function
export const POST = WithContext(async ({ user, profileId, req }) => {
  console.log("[Chat API] Request started");

  const body = await req.json();
  console.log(`[Chat API] chatMode=${body.chatMode ?? "(missing)"}`);

  // ─ Pre-compute stable session ID so the X-Session-Id response header is
  //   set before orchestration runs. PrepareChatUseCase reads body.sessionId
  //   when present, so we guarantee both use the same ID.
  const sessionId: string = body.sessionId ?? crypto.randomUUID();
  body.sessionId = sessionId;
  const isUserTurn: boolean = body.message?.role === "user";

  // ─ Load resume state before the stream — only needs sessionId (fast read) ─
  const resumeState = await loadChatWorkflowResumeState({
    profileId,
    sessionId,
  });
  const resumeFromNode = resumeState?.checkpoint?.nodeName;
  if (resumeFromNode) {
    console.log(
      `[Chat API] Resuming persistence from checkpoint: ${resumeFromNode}`,
    );
  }

  let persistPayload: PersistPayload | null = null;

  // Mutable usage state — mutated by handleAgentStepFinish during streaming,
  // read by scheduleChatPersistence after() callback via the getter.
  const usageState: StreamUsageState = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    zeroOutputSteps: 0,
  };

  const generateMessageId = createIdGenerator({ prefix: "msg", size: 16 });

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // ── 1. Immediate feedback — the client receives bytes before orchestration
      //       starts. "Thinking..." appears in the loading bar right away.
      if (isUserTurn) {
        writer.write({ type: "start", messageId: generateMessageId() });
      }
      writer.write({
        type: "data-progress",
        data: {
          stage: "Thinking...",
          loadingHints: [],
          agentType: "",
          reasoning: "",
        },
        transient: true,
      });

      // ── 2. Orchestration inside the stream — routing, RAG gating, memory fetch
      const { preparedChat } = await runChatPreparationGraph({
        userId: user.uid,
        profileId,
        body,
      });

      const {
        agent,
        sanitizedMessages,
        messages,
        options,
        agentType,
        loadingHints,
        ctx,
        gatewayReasoning,
        directResponse,
        toolOutputMerge,
      } = preparedChat;

      // ── 3. Register background persistence — after() works inside execute
      scheduleChatPersistence({
        isUserTurn,
        userId: user.uid,
        profileId,
        sessionId,
        agentType,
        ctx,
        getPersistPayload: () => persistPayload,
        getUsageState: () => usageState,
        options,
        resumeFromNode,
      });

      // ── 4. Write ONE real progress event and handle direct response. ──────
      //       writePostOrchestrationProgress converts camelCase agentType into
      //       a readable fallback stage when loadingHints is empty (cache hits).
      writePostOrchestrationProgress(
        writer,
        agentType,
        loadingHints,
        gatewayReasoning,
      );

      // Handle direct response — skipProgress=true so initializeChatStream
      // doesn't write a redundant third data-progress event.
      const initResult = await initializeChatStream(
        writer,
        false,
        generateMessageId,
        directResponse,
        (payload) => {
          persistPayload = payload;
        },
        ctx,
        loadingHints,
        agentType,
        gatewayReasoning,
        true, // skipProgress — progress already written above
      );

      if (initResult.shouldReturn) {
        return;
      }

      // ── 5. Parallel Meal Planner Path (2026 Gold Standard) ──────────────────
      if (agentType === "nutrition" && isMealPlanRequest(ctx.userQuery)) {
        console.log(
          "[Chat API] Nutrition meal plan detected → using parallel planner (Promise.all fan-out)",
        );
        const result = await handleParallelMealPlanner(
          user.uid,
          profileId,
          sessionId,
          ctx.userQuery,
          messages,
          ctx,
          writer,
        );

        if (result) {
          persistPayload = result;
          console.log(
            "[Chat API] Parallel meal plan complete: streamed and persisted",
          );
          return;
        }
      }

      // ── 6. Standard Agent Stream ─────────────────────────────────────────────
      await executeStandardAgentStream(
        writer,
        agent,
        sanitizedMessages,
        options,
        req,
        generateMessageId,
        usageState,
        ctx,
        isUserTurn,
        toolOutputMerge,
        agentType,
        messages,
        (payload) => {
          persistPayload = payload;
        },
      );
    },
    onError: handleChatStreamError,
  });

  return buildChatResponse({ stream, sessionId });
});
