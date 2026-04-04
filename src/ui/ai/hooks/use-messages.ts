"use client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { useEffect, useRef, useState, useTransition } from "react";

import { addToMap, extractToolInput, isToolPart } from "@/ui/ai/types";
import type { AskQuestionInput, ConditionInput } from "@/ui/ai/types";
import { progressPartSchema } from "@/ui/ai/types/progress";
import { usagePartSchema } from "@/ui/ai/types/usage";
import type { UsageData } from "@/ui/ai/types/usage";
import { errorPartSchema } from "@/ui/ai/types/error";
import { getWelcomeMessage } from "@/ui/ai/session";
import {
  useMessagesQuery,
  useInvalidateSessions,
  useInvalidateCredits,
  useOptimisticDeductCredit,
  useInvalidateAssessments,
  useAddConditionMutation,
  useSetMessagesCache,
  flattenMessagePages,
  useProfileQuery,
} from "@/ui/ai/query";
import type { MessageRecord } from "@/ui/ai/query";

function mergeProgressPhrases(args: {
  stage: string;
  loadingHints?: string[];
  previous: string[];
}): string[] {
  return [args.stage, ...(args.loadingHints ?? []), ...args.previous].filter(
    (value, index, array) => array.indexOf(value) === index,
  );
}

/** Question types that render their own inline answer UI inside the card.
 *  Everything else (including "free_text" and unknown types) uses the input bar. */
const INLINE_ANSWER_TYPES = new Set([
  "yes_no",
  "single_choice",
  "multi_choice",
  "scale",
]);

/**
 * Check if all tool calls in the last assistant message have outputs provided.
 * Replaces SDK's lastAssistantMessageIsCompleteWithToolCalls which internally
 * uses isToolUIPart and fails on DB-deserialized messages.
 */
function isLastMessageToolOutputsComplete(messages: UIMessage[]): boolean {
  const lastMsg = messages.at(-1);
  if (lastMsg?.role !== "assistant") return false;
  let hasClientToolParts = false;
  for (const part of lastMsg.parts) {
    if (!isToolPart(part)) continue;
    // Server-executed tools already have their result — skip them.
    if (part.state === "result") continue;
    hasClientToolParts = true;
    if (part.state !== "output-available") return false;
  }
  return hasClientToolParts;
}

// ── useMessages ───────────────────────────────────────────────────────────────
// Encapsulates all message-related state and logic for a chat session:
//   • useChat (messages / sendMessage / status)
//   • answered Q&A IDs
//   • persistence via TanStack Query mutation
//   • cycling loading status phrase animation
//   • inline message editing
//   • handleAnswer for tool Q&A
//   • pendingFreeTextId computation

// eslint-disable-next-line max-lines-per-function
export function useMessages(sessionId: string) {
  // Pending attachments state for file uploads
  const [pendingAttachments, setPendingAttachments] = useState<
    {
      fileId?: string;
      url: string;
      mediaType: string;
      fileName?: string;
      label?: string;
    }[]
  >([]);
  const { data: profile } = useProfileQuery();
  // Dynamic loading hints received from the gateway via response header.
  const [loadingHints, setLoadingHints] = useState<string[]>([]);
  // Which specialist agent is handling the current request (live — current stream only).
  const [agentType, setAgentType] = useState<string | undefined>();
  // Why the specialist agent was selected for this request (live — current stream only).
  const [reasoning, setReasoning] = useState<string | undefined>();
  // Ref that holds the agent for the current stream so it can be tagged on
  // the last assistant message when the stream finishes (status → "ready").
  const pendingAgentTypeRef = useRef<string | undefined>(undefined);
  // Ref that holds the reasoning for the current stream to tag on the message.
  const pendingReasoningRef = useRef<string | undefined>(undefined);
  // Live token usage received via the stream (before DB persistence).
  const [liveUsage, setLiveUsage] = useState<UsageData | null>(null);
  // ── DB message hydration ──────────────────────────────────────────────────
  const {
    data: dbData,
    isSuccess: dbLoaded,
    isPending: isMessagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessagesQuery(sessionId);
  const dbMessages = flattenMessagePages(dbData);
  const invalidateSessions = useInvalidateSessions();
  const invalidateCredits = useInvalidateCredits();
  const optimisticDeductCredit = useOptimisticDeductCredit();
  const invalidateAssessments = useInvalidateAssessments();
  const { mutate: addCondition } = useAddConditionMutation();
  const setMessagesCache = useSetMessagesCache(sessionId);
  const hasHydrated = useRef(false);
  const [isHydratedState, setIsHydratedState] = useState(false);
  const hydratedCountRef = useRef(0);
  // Gate that prevents sendAutomaticallyWhen from firing during hydration.
  // Only set to true right before an explicit addToolOutput/addToolApprovalResponse call.
  const toolOutputPendingRef = useRef(false);

  // Reset hydration flag and local state when session changes.
  useEffect(() => {
    hasHydrated.current = false;
    setIsHydratedState(false);
    hydratedCountRef.current = 0;
    toolOutputPendingRef.current = false;
    setAnsweredIds(new Map<string, string>());
    setLiveUsage(null);
    setAgentType(undefined);
    setReasoning(undefined);
    pendingAgentTypeRef.current = undefined;
    pendingReasoningRef.current = undefined;
    setPendingAttachments([]);
    // Immediately show the welcome message so there's no flash of the old
    // session's content while the DB query for the new session is in-flight.
    setMessages(getWelcomeMessage(profile?.name?.split(" ")[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const [answeredIds, setAnsweredIds] = useState<ReadonlyMap<string, string>>(
    () => new Map<string, string>(),
  );

  // ── Cycling status phrase animation (declared before useChat for onData) ──
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [phraseFading, setPhraseFading] = useState(false);

  // ── AI SDK chat ───────────────────────────────────────────────────────────
  const {
    messages,
    setMessages,
    sendMessage,
    addToolOutput,
    addToolApprovalResponse,
    status,
    stop,
    error,
    regenerate,
  } = useChat({
    id: sessionId,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        sessionId,
        chatMode: "quick",
        ...(pendingAttachments.length > 0
          ? { attachmentUrls: pendingAttachments }
          : {}),
      },
      // Server-managed persistence — only send the last message.
      // Server loads full conversation history from Firestore.
      // Strip step-start boundaries before sending. These are structural UI
      // markers for multi-step rendering and should not round-trip.
      prepareSendMessagesRequest({ messages: allMessages, body }) {
        const lastMsg = allMessages.at(-1);
        if (!lastMsg) {
          return { body: body ?? {} };
        }
        return {
          body: {
            ...body,
            message: {
              ...lastMsg,
              parts: lastMsg.parts.filter((p) => p.type !== "step-start"),
            },
          },
        };
      },
    }),
    onData: (part) => {
      if (part.type === "data-usage") {
        const parsed = usagePartSchema.safeParse(part.data);
        if (parsed.success) setLiveUsage(parsed.data);
        return;
      }
      if (part.type === "data-error") {
        const parsed = errorPartSchema.safeParse(part.data);
        if (parsed.success) {
          console.warn(
            `[Chat] Server reported error: ${parsed.data.code} — ${parsed.data.message}`,
          );
        }
        return;
      }
      if (part.type !== "data-progress") return;
      const parsed = progressPartSchema.safeParse(part.data);
      if (!parsed.success) return;
      const {
        stage,
        loadingHints: hints,
        agentType: agent,
        reasoning: reason,
      } = parsed.data;
      if (agent) {
        setAgentType(agent);
        pendingAgentTypeRef.current = agent;
      }
      if (reason) {
        setReasoning(reason);
        pendingReasoningRef.current = reason;
      }
      setLoadingHints((prev) =>
        mergeProgressPhrases({
          stage,
          loadingHints: hints,
          previous: prev,
        }),
      );
      setPhraseIdx(0);
    },
    messages: getWelcomeMessage(profile?.name?.split(" ")[0]),
    sendAutomaticallyWhen: ({ messages: msgs }) => {
      // Only allow auto-send when the user explicitly provided tool output
      // (not during hydration of old DB messages with completed tool parts).
      const pendingGate = toolOutputPendingRef.current;
      const lastComplete = isLastMessageToolOutputsComplete(msgs);
      if (!pendingGate) return false;
      return lastComplete;
    },
  });

  const isLoading = status === "streaming" || status === "submitted";

  // ── Hydrate useChat with DB messages on first load ────────────────────────
  useEffect(() => {
    if (dbLoaded && !hasHydrated.current) {
      hasHydrated.current = true;
      setIsHydratedState(true);
      if (dbMessages.length > 0) {
        const uiMsgs = dbMessages.map(dbToUIMessage);
        setMessages(uiMsgs);
        hydratedCountRef.current = dbMessages.length;
        // Restore answered tool calls so question cards show as answered.
        const restored = extractAnsweredIds(uiMsgs);
        if (restored.size > 0) setAnsweredIds(restored);
      } else {
        // New / empty session — reset to the welcome message.
        setMessages(getWelcomeMessage(profile?.name?.split(" ")[0]));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbLoaded, dbMessages, setMessages]);

  // ── Prepend older pages when the user loads more ──────────────────────────
  useEffect(() => {
    if (!hasHydrated.current || dbMessages.length === 0) return;
    // Only act when the flattened DB set has grown (a new older page was fetched).
    if (dbMessages.length > hydratedCountRef.current) {
      const oldIds = new Set(messages.map((m) => m.id));
      const olderRecords = dbMessages.filter((r) => !oldIds.has(r.id));
      if (olderRecords.length > 0) {
        setMessages([...olderRecords.map(dbToUIMessage), ...messages]);
      }
      hydratedCountRef.current = dbMessages.length;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbMessages.length]);

  // ── Optimistic cache sync + sidebar/credits invalidation ────────────────────
  useEffect(() => {
    // Build lookups so we preserve original createdAt and usage from DB records
    // instead of overwriting every message with "now" (which kills date separators)
    // or dropping usage data (which hides token counts).
    const dbTimestamps = new Map(
      (dbMessages ?? []).map((r) => [r.id, r.createdAt]),
    );
    const dbUsage = new Map(
      (dbMessages ?? []).filter((r) => r.usage).map((r) => [r.id, r.usage!]),
    );
    const dbAgentTypes = new Map(
      (dbMessages ?? [])
        .filter((r) => r.agentType)
        .map((r) => [r.id, r.agentType!]),
    );

    if (status === "ready" && hasHydrated.current) {
      setPendingAttachments([]);
      // Clear live usage — DB will have the persisted data after refetch.
      setLiveUsage(null);
      // Sync the complete conversation (including streamed AI response) to
      // the TQ messages cache so switching sessions is instant.
      setMessagesCache(
        messages
          .filter((m) => m.id !== "welcome")
          .map((m) =>
            uiToMessageRecord(
              m,
              sessionId,
              dbTimestamps.get(m.id),
              dbUsage.get(m.id),
              m.role === "assistant"
                ? (dbAgentTypes.get(m.id) ?? pendingAgentTypeRef.current)
                : undefined,
            ),
          ),
      );
      invalidateSessions();
      invalidateCredits();
      invalidateAssessments();
    }
    // Optimistically cache the user's message and update sidebar as soon
    // as the request is submitted — before the AI starts streaming.
    if (status === "submitted") {
      setPendingAttachments([]);
      // The send happened — reset the gate so hydration of the response
      // doesn't accidentally re-trigger auto-send.
      toolOutputPendingRef.current = false;
      setMessagesCache(
        messages
          .filter((m) => m.id !== "welcome")
          .map((m) =>
            uiToMessageRecord(
              m,
              sessionId,
              dbTimestamps.get(m.id),
              dbUsage.get(m.id),
              m.role === "assistant" ? dbAgentTypes.get(m.id) : undefined,
            ),
          ),
      );
      optimisticDeductCredit();
      invalidateSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // ── Cycling status phrase animation ───────────────────────────────────────
  useEffect(() => {
    if (!isLoading) {
      setPhraseIdx(0);
      setLoadingHints([]);
      return;
    }
    const interval = setInterval(() => {
      setPhraseFading(true);
      setTimeout(() => {
        setPhraseIdx((i) => i + 1);
        setPhraseFading(false);
      }, 300);
    }, 2800);
    return () => clearInterval(interval);
  }, [isLoading]);

  // ── Inline edit ───────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [, startMessagesTransition] = useTransition();

  // Clear any in-progress edit when the session changes.
  useEffect(() => {
    setEditingId(null);
    setEditingText("");
  }, [sessionId]);

  function handleEditStart(msgId: string, text: string) {
    setEditingId(msgId);
    setEditingText(text);
  }

  function handleEditCancel() {
    setEditingId(null);
    setEditingText("");
  }

  function handleEditSubmit(msgId: string) {
    const text = editingText.trim();
    if (!text) return;
    const idx = messages.findIndex((m) => m.id === msgId);
    startMessagesTransition(() => {
      setMessages(idx > 0 ? messages.slice(0, idx) : []);
    });
    setEditingId(null);
    setEditingText("");
    void sendMessage({ text });
  }

  function handleEditKeyDown(
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    msgId: string,
  ) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEditSubmit(msgId);
    }
    if (e.key === "Escape") handleEditCancel();
  }

  // ── Q&A helpers ───────────────────────────────────────────────────────────
  function handleAnswer(toolCallId: string, answer: string) {
    setAnsweredIds((prev) => addToMap(prev, toolCallId, answer));

    // When the user says "Yes" to the Health Records question, find the
    // most recent recordCondition tool call and save it automatically.
    if (answer === "Yes") {
      for (const msg of messages) {
        if (msg.role !== "assistant") continue;
        for (const part of msg.parts) {
          if (!isToolPart(part)) continue;
          const tcId = part.toolCallId ?? "";
          if (tcId !== toolCallId) continue;
          const q = extractToolInput<AskQuestionInput>(part, "askQuestion");
          if (q?.question.toLowerCase().includes("health record")) {
            // Found the Health Records question — find the most recent condition.
            const condition = findMostRecentCondition(messages);
            if (condition) {
              addCondition({
                sessionId,
                name: condition.name,
                icd10: condition.icd10,
                severity: condition.severity,
                status: condition.status,
                description: condition.description,
                symptoms: condition.symptoms,
              });
            }
          }
          break;
        }
      }
    }

    toolOutputPendingRef.current = true;
    addToolOutput({ tool: "askQuestion", toolCallId, output: answer });
  }

  // ── Message timestamps map ──────────────────────────────────────────────
  // Build a msgId→ISO timestamp map for date grouping in the UI.
  // DB records carry `createdAt`; live messages get "now" as fallback.
  const messageTimestamps = (() => {
    const map = new Map<string, string>();
    if (dbMessages) {
      for (const r of dbMessages) map.set(r.id, r.createdAt);
    }
    const now = new Date().toISOString();
    for (const m of messages) {
      if (!map.has(m.id)) map.set(m.id, now);
    }
    return map;
  })();

  // ── Message usage map ─────────────────────────────────────────────────
  // Build a msgId→TokenUsage map so the UI can show token counts.
  const messageUsage = (() => {
    const map = new Map<string, NonNullable<MessageRecord["usage"]>>();
    if (dbMessages) {
      for (const r of dbMessages) {
        if (r.usage) map.set(r.id, r.usage);
      }
    }
    return map;
  })();

  // ── Message agent type map ────────────────────────────────────────────
  // Build a msgId→agentType map so every assistant message knows its agent.
  // DB records carry the persisted value; the last live message gets the
  // current stream's agent type overlaid so it shows immediately (before DB save).
  const messageAgentTypes = (() => {
    const map = new Map<string, string>();
    if (dbMessages) {
      for (const r of dbMessages) {
        if (r.agentType) map.set(r.id, r.agentType);
      }
    }
    // Overlay the live agent type onto the last assistant message so it
    // appears during streaming (before the DB record is written and refetched).
    if (agentType) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "assistant") {
          map.set(messages[i].id, agentType);
          break;
        }
      }
    }
    return map as ReadonlyMap<string, string>;
  })();

  // ── Message reasoning map ─────────────────────────────────────────────
  // Build a msgId→reasoning map so every assistant message knows why that
  // specialist was selected. For now, only overlay the live reasoning onto
  // the last message; persistence will be added later if needed.
  const messageReasonings = (() => {
    const map = new Map<string, string>();
    // Overlay the live reasoning onto the last assistant message so it
    // appears during streaming (before the DB record is written and refetched).
    if (reasoning) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "assistant") {
          map.set(messages[i].id, reasoning);
          break;
        }
      }
    }
    return map as ReadonlyMap<string, string>;
  })();

  // ── Helper to append a message directly (for Gemini Live) ────────────────
  function appendMessage(message: UIMessage): void {
    startMessagesTransition(() => {
      setMessages([...messages, message]);
    });
  }

  return {
    // Chat core
    messages,
    messageTimestamps,
    messageUsage,
    liveUsage,
    sendMessage,
    appendMessage,
    stop,
    status,
    isLoading,
    isMessagesLoading,
    // True once DB messages have been hydrated into useChat (prevents empty-state flash)
    isHydrated: isHydratedState,
    answeredIds,
    // Pagination — load older messages
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    // Loading phrase animation
    phraseIdx,
    phraseFading,
    loadingHints,
    // Agent type from gateway routing (live — current stream only)
    agentType,
    // Reasoning for why agent was selected (live — current stream only)
    reasoning,
    // Per-message agent type map (DB-persisted + live overlay)
    messageAgentTypes,
    // Per-message reasoning map (live overlay only)
    messageReasonings,
    // Inline edit
    editingId,
    editingText,
    setEditingText,
    handleEditStart,
    handleEditCancel,
    handleEditSubmit,
    handleEditKeyDown,
    // Q&A
    handleAnswer,
    // Tool approval — wrapped to set the auto-send gate
    addToolApprovalResponse: (
      ...args: Parameters<typeof addToolApprovalResponse>
    ) => {
      toolOutputPendingRef.current = true;
      return addToolApprovalResponse(...args);
    },
    // Pending attachments for file uploads
    pendingAttachments,
    setPendingAttachments,
    // Pending free-text question — when the AI asks a question that requires
    // typed input (free_text, or any unrecognised type), the user answers via
    // the input bar rather than inline question-card buttons.
    pendingFreeText: (() => {
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m.role !== "assistant") continue;
        for (const p of m.parts) {
          if (!isToolPart(p) || p.state !== "input-available") continue;
          const q = extractToolInput<AskQuestionInput>(p, "askQuestion");
          if (q && !INLINE_ANSWER_TYPES.has(q.type)) {
            return {
              toolCallId: p.toolCallId!,
              question: q.question,
            };
          }
        }
      }
      return null;
    })(),
    // Pending non-input-bar tool calls — true when the LAST assistant message
    // has unresolved tool invocations that the user must resolve inline
    // (i.e. question types that render their own answer UI: yes/no, chips, scale).
    // Only checks the most recent assistant message so that once the AI sends
    // a new text-only reply (e.g. farewell), the input bar re-enables.
    hasPendingToolCall: (() => {
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m.role !== "assistant") continue;
        return m.parts.some((p) => {
          if (!isToolPart(p)) return false;
          if (p.state === "approval-requested") return true;
          if (p.state !== "input-available") return false;
          const q = extractToolInput<AskQuestionInput>(p, "askQuestion");
          // Non-askQuestion tool calls always block (e.g. approval flows).
          if (!q) return true;
          // Only block for question types that render inline answer UI.
          return INLINE_ANSWER_TYPES.has(q.type);
        });
      }
      return false;
    })(),
    // Error state
    error,
    regenerate,
  } as const;
}

// ── DB → UIMessage converter ──────────────────────────────────────────────────

/** Extract answered askQuestion tool calls from hydrated messages. */
function extractAnsweredIds(msgs: UIMessage[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const msg of msgs) {
    if (msg.role !== "assistant") continue;
    for (const part of msg.parts) {
      const p = part as unknown as {
        type?: string;
        state?: string;
        toolCallId?: string;
        output?: unknown;
      };
      if (
        p.type === "tool-askQuestion" &&
        (p.state === "result" || p.state === "output-available") &&
        p.toolCallId &&
        typeof p.output === "string"
      ) {
        map.set(p.toolCallId, p.output);
      }
    }
  }
  return map;
}

/** Walk backwards through messages and return the input of the most recent `recordCondition` call. */
function findMostRecentCondition(msgs: UIMessage[]): ConditionInput | null {
  for (let i = msgs.length - 1; i >= 0; i--) {
    const msg = msgs[i];
    if (msg.role !== "assistant") continue;
    for (const part of msg.parts) {
      if (!isToolPart(part)) continue;
      const condition = extractToolInput<ConditionInput>(
        part,
        "recordCondition",
      );
      if (condition) return condition;
    }
  }
  return null;
}
function dbToUIMessage(record: MessageRecord): UIMessage {
  // Content is stored as JSON-serialised parts array and normalized server-side
  // in the sessions model mapper. Parse directly here; fallback to plain text
  // for legacy non-JSON strings.
  let parts: UIMessage["parts"];

  try {
    const parsed = JSON.parse(record.content) as Array<Record<string, unknown>>;
    if (Array.isArray(parsed) && parsed.length > 0) {
      parts = parsed as UIMessage["parts"];
    } else {
      parts = [{ type: "text", text: record.content }];
    }
  } catch {
    parts = [{ type: "text", text: record.content }];
  }

  return { id: record.id, role: record.role, parts } as UIMessage;
}

// ── UIMessage → MessageRecord converter (optimistic cache) ────────────────────
function uiToMessageRecord(
  msg: UIMessage,
  sessionId: string,
  createdAt?: string,
  usage?: MessageRecord["usage"],
  agentType?: string,
): MessageRecord {
  return {
    id: msg.id,
    sessionId,
    role: msg.role as "user" | "assistant",
    content: JSON.stringify(msg.parts),
    createdAt: createdAt ?? new Date().toISOString(),
    ...(usage && { usage }),
    ...(agentType && { agentType }),
  };
}
