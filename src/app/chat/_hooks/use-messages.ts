"use client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart } from "ai";
import type { UIMessage } from "ai";
import { useEffect, useRef, useState, useTransition } from "react";

import { addToSet, extractToolInput } from "@/app/chat/_types";
import type { AskQuestionInput, ConditionInput } from "@/app/chat/_types";
import { INITIAL_MESSAGES } from "@/app/chat/_session";
import {
  useMessagesQuery,
  useInvalidateSessions,
  useInvalidateCredits,
  useInvalidateAssessments,
  useAddConditionMutation,
} from "@/app/chat/_query";
import type { MessageRecord } from "@/app/chat/_query";
import { useActiveProfile } from "@/app/chat/_context/active-profile-context";

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
  const { activeDependentId } = useActiveProfile();

  // ── DB message hydration ──────────────────────────────────────────────────
  const {
    data: dbMessages,
    isSuccess: dbLoaded,
    isPending: isMessagesLoading,
  } = useMessagesQuery(sessionId);
  const invalidateSessions = useInvalidateSessions();
  const invalidateCredits = useInvalidateCredits();
  const invalidateAssessments = useInvalidateAssessments();
  const { mutate: addCondition } = useAddConditionMutation();
  const hasHydrated = useRef(false);

  // Reset hydration flag and local state when session changes.
  useEffect(() => {
    hasHydrated.current = false;
    setAnsweredIds(new Set<string>());
    // Immediately show the welcome message so there's no flash of the old
    // session's content while the DB query for the new session is in-flight.
    setMessages(INITIAL_MESSAGES);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const [answeredIds, setAnsweredIds] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );

  // ── AI SDK chat ───────────────────────────────────────────────────────────
  const { messages, setMessages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { sessionId },
      headers: activeDependentId ? { "x-dependent-id": activeDependentId } : {},
    }),
    messages: INITIAL_MESSAGES,
  });

  const isLoading = status === "streaming" || status === "submitted";

  // ── Hydrate useChat with DB messages on first load ────────────────────────
  useEffect(() => {
    if (dbLoaded && !hasHydrated.current) {
      hasHydrated.current = true;
      if (dbMessages && dbMessages.length > 0) {
        setMessages(dbMessages.map(dbToUIMessage));
      } else {
        // New / empty session — reset to the welcome message.
        setMessages(INITIAL_MESSAGES);
      }
    }
  }, [dbLoaded, dbMessages, setMessages]);

  // ── Invalidate sidebar + credits after streaming completes ──────────────────
  useEffect(() => {
    if (status === "ready" && hasHydrated.current) {
      invalidateSessions();
      invalidateCredits();
      invalidateAssessments();
    }
    // Invalidate the sessions list as soon as a message is submitted so the
    // new session appears in the sidebar immediately without waiting for the
    // full AI response to finish streaming.
    if (status === "submitted") {
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
    setAnsweredIds((prev) => addToSet(prev, toolCallId));

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

    void sendMessage({ text: answer });
  }

  // Find the last unanswered free-text question (for input-bar interception)
  let pendingFreeTextId: string | null = null;
  for (let mi = messages.length - 1; mi >= 0; mi--) {
    const msg = messages[mi];
    if (msg.role !== "assistant") continue;
    for (const part of msg.parts) {
      if (!isToolUIPart(part)) continue;
      const q = extractToolInput<AskQuestionInput>(part, "askQuestion");
      const tcId =
        (part as unknown as { toolCallId?: string }).toolCallId ?? "";
      if (q && q.type === "free_text" && !answeredIds.has(tcId)) {
        pendingFreeTextId = tcId;
        break;
      }
    }
    if (pendingFreeTextId) break;
  }

  return {
    // Chat core
    messages,
    sendMessage,
    stop,
    status,
    isLoading,
    isMessagesLoading,
    answeredIds,
    pendingFreeTextId,
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
