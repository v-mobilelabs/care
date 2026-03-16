"use client";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithToolCalls,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
import type { UIMessage } from "ai";
import { useEffect, useRef, useState, useTransition } from "react";

import { addToMap, extractToolInput } from "@/ui/chat/types";
import type { AskQuestionInput, ConditionInput } from "@/ui/chat/types";
import { getWelcomeMessage } from "@/ui/chat/session";
import { useMemo } from "react";
import {
  useMessagesQuery,
  useInvalidateSessions,
  useInvalidateCredits,
  useOptimisticDeductCredit,
  useInvalidateAssessments,
  useAddConditionMutation,
  useSetMessagesCache,
  flattenMessagePages,
} from "@/ui/chat/query";
import type { MessageRecord } from "@/ui/chat/query";
import { useActiveProfile } from "@/ui/chat/context/active-profile-context";
import { useCurrentProfile } from "@/lib/auth/use-current-profile";

// ── useMessages ───────────────────────────────────────────────────────────────
// Encapsulates all message-related state and logic for a chat session:
//   • useChat (messages / sendMessage / status)
//   • answered Q&A IDs
//   • persistence via TanStack Query mutation
//   • cycling loading status phrase animation
//   • inline message editing
//   • handleAnswer for tool Q&A
//   • pendingFreeTextId computation

export function useMessages(sessionId: string) {
  // Pending attachments state for file uploads
  const [pendingAttachments, setPendingAttachments] = useState<
    { url: string; mediaType: string }[]
  >([]);
  const { activeDependentId } = useActiveProfile();
  const { data: profile } = useCurrentProfile();
  // ── DB message hydration ──────────────────────────────────────────────────
  const {
    data: dbData,
    isSuccess: dbLoaded,
    isPending: isMessagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessagesQuery(sessionId);
  const dbMessages = useMemo(() => flattenMessagePages(dbData), [dbData]);
  const invalidateSessions = useInvalidateSessions();
  const invalidateCredits = useInvalidateCredits();
  const optimisticDeductCredit = useOptimisticDeductCredit();
  const invalidateAssessments = useInvalidateAssessments();
  const { mutate: addCondition } = useAddConditionMutation();
  const setMessagesCache = useSetMessagesCache(sessionId);
  const hasHydrated = useRef(false);
  const [isHydratedState, setIsHydratedState] = useState(false);
  const hydratedCountRef = useRef(0);

  // Reset hydration flag and local state when session changes.
  useEffect(() => {
    hasHydrated.current = false;
    setIsHydratedState(false);
    hydratedCountRef.current = 0;
    setAnsweredIds(new Map<string, string>());
    // Immediately show the welcome message so there's no flash of the old
    // session's content while the DB query for the new session is in-flight.
    setMessages(getWelcomeMessage(profile?.name?.split(" ")[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, profile]);

  const [answeredIds, setAnsweredIds] = useState<ReadonlyMap<string, string>>(
    () => new Map<string, string>(),
  );

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
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { sessionId },
      headers: activeDependentId ? { "x-dependent-id": activeDependentId } : {},
    }),
    messages: getWelcomeMessage(profile?.name?.split(" ")[0]),
    sendAutomaticallyWhen: (args: { messages: UIMessage[] }) =>
      lastAssistantMessageIsCompleteWithToolCalls(args) ||
      lastAssistantMessageIsCompleteWithApprovalResponses(args),
  });

  const isLoading = status === "streaming" || status === "submitted";

  // ── Hydrate useChat with DB messages on first load ────────────────────────
  useEffect(() => {
    if (dbLoaded && !hasHydrated.current) {
      hasHydrated.current = true;
      setIsHydratedState(true);
      if (dbMessages.length > 0) {
        setMessages(dbMessages.map(dbToUIMessage));
        hydratedCountRef.current = dbMessages.length;
      } else {
        // New / empty session — reset to the welcome message.
        setMessages(getWelcomeMessage(profile?.name?.split(" ")[0]));
      }
    }
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
    // Build a lookup so we preserve original createdAt from DB records
    // instead of overwriting every message with "now" (which kills date separators).
    const dbTimestamps = new Map(
      (dbMessages ?? []).map((r) => [r.id, r.createdAt]),
    );

    if (status === "ready" && hasHydrated.current) {
      // Sync the complete conversation (including streamed AI response) to
      // the TQ messages cache so switching sessions is instant.
      setMessagesCache(
        messages
          .filter((m) => m.id !== "welcome")
          .map((m) => uiToMessageRecord(m, sessionId, dbTimestamps.get(m.id))),
      );
      invalidateSessions();
      invalidateCredits();
      invalidateAssessments();
    }
    // Optimistically cache the user's message and update sidebar as soon
    // as the request is submitted — before the AI starts streaming.
    if (status === "submitted") {
      setMessagesCache(
        messages
          .filter((m) => m.id !== "welcome")
          .map((m) => uiToMessageRecord(m, sessionId, dbTimestamps.get(m.id))),
      );
      optimisticDeductCredit();
      invalidateSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // ── Cycling status phrase animation ───────────────────────────────────────
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [phraseFading, setPhraseFading] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setPhraseIdx(0);
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
          if (!isToolUIPart(part)) continue;
          const tcId =
            (part as unknown as { toolCallId?: string }).toolCallId ?? "";
          if (tcId !== toolCallId) continue;
          const q = extractToolInput<AskQuestionInput>(part, "askQuestion");
          if (q && q.question.toLowerCase().includes("health record")) {
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

    addToolOutput({ tool: "askQuestion", toolCallId, output: answer });
  }

  // ── Message timestamps map ──────────────────────────────────────────────
  // Build a msgId→ISO timestamp map for date grouping in the UI.
  // DB records carry `createdAt`; live messages get "now" as fallback.
  const messageTimestamps = useMemo(() => {
    const map = new Map<string, string>();
    if (dbMessages) {
      for (const r of dbMessages) map.set(r.id, r.createdAt);
    }
    const now = new Date().toISOString();
    for (const m of messages) {
      if (!map.has(m.id)) map.set(m.id, now);
    }
    return map;
  }, [dbMessages, messages]);

  // ── Message usage map ─────────────────────────────────────────────────
  // Build a msgId→TokenUsage map so the UI can show token counts.
  const messageUsage = useMemo(() => {
    const map = new Map<string, NonNullable<MessageRecord["usage"]>>();
    if (dbMessages) {
      for (const r of dbMessages) {
        if (r.usage) map.set(r.id, r.usage);
      }
    }
    return map;
  }, [dbMessages]);

  return {
    // Chat core
    messages,
    messageTimestamps,
    messageUsage,
    sendMessage,
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
    // Tool approval
    addToolApprovalResponse,
    // Pending attachments for file uploads
    pendingAttachments,
    setPendingAttachments,
    // Pending free-text question — when the AI asks a free_text question via
    // askQuestion, the user should answer via the input bar (not a separate textarea).
    pendingFreeText: (() => {
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m.role !== "assistant") continue;
        for (const p of m.parts) {
          if (!isToolUIPart(p) || p.state !== "input-available") continue;
          const q = extractToolInput<AskQuestionInput>(p, "askQuestion");
          if (q?.type === "free_text") {
            return {
              toolCallId: (p as unknown as { toolCallId: string }).toolCallId,
              question: q.question,
            };
          }
        }
      }
      return null;
    })(),
    // Pending non-free-text tool calls — true when the LAST assistant message
    // has unresolved tool invocations that the user must resolve inline
    // (excludes free_text questions which go through the input bar).
    // Only checks the most recent assistant message so that once the AI sends
    // a new text-only reply (e.g. farewell), the input bar re-enables.
    hasPendingToolCall: (() => {
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m.role !== "assistant") continue;
        return m.parts.some((p) => {
          if (!isToolUIPart(p)) return false;
          if (p.state === "approval-requested") return true;
          if (p.state !== "input-available") return false;
          const q = extractToolInput<AskQuestionInput>(p, "askQuestion");
          return !q || q?.type !== "free_text";
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
/** Walk backwards through messages and return the input of the most recent `recordCondition` call. */
function findMostRecentCondition(msgs: UIMessage[]): ConditionInput | null {
  for (let i = msgs.length - 1; i >= 0; i--) {
    const msg = msgs[i];
    if (msg.role !== "assistant") continue;
    for (const part of msg.parts) {
      if (!isToolUIPart(part)) continue;
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
  // Content is stored as JSON-serialised parts array. Parse and restore
  // directly — tool-invocation parts with state="result" are non-interactive
  // so tool cards render in their completed (read-only) state. file parts
  // restore images. Fallback to a plain text part for legacy plain strings.
  let parts: UIMessage["parts"];

  try {
    const parsed = JSON.parse(record.content) as Array<Record<string, unknown>>;
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Normalise legacy parts saved as `type:"tool-invocation"` + `toolName` + `result`
      // to the current SDK-compatible shape `type:"tool-{toolName}"` + `input` + `output`.
      parts = parsed.map((p) => {
        if (p.type === "tool-invocation" && typeof p.toolName === "string") {
          return {
            type: `tool-${p.toolName}`,
            toolCallId: p.toolCallId ?? "",
            state: "result",
            input: p.args ?? p.input ?? null,
            output: p.result ?? p.output ?? null,
          };
        }
        return p;
      }) as UIMessage["parts"];
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
): MessageRecord {
  return {
    id: msg.id,
    sessionId,
    role: msg.role as "user" | "assistant",
    content: JSON.stringify(msg.parts),
    createdAt: createdAt ?? new Date().toISOString(),
  };
}
