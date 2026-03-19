import type { UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";

const SCROLL_THRESHOLD = 120; // px from bottom before button appears

export function useAutoScroll(
  messages: UIMessage[],
  isLoading: boolean,
  preparingLabel?: string,
) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // Track message IDs present on first render — only animate messages added after mount.
  const initialIdsRef = useRef<ReadonlySet<string>>(
    new Set(messages.map((m) => m.id)),
  );

  const messageCount = messages.length;

  const checkScrollPosition = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distanceFromBottom > SCROLL_THRESHOLD);
  }, []);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Auto-scroll to bottom only when already near the bottom
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom <= SCROLL_THRESHOLD) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messageCount, isLoading, preparingLabel]);

  // ── Preserve scroll position when older messages are prepended ──────────
  const prevScrollHeightRef = useRef(0);
  const prevMessageCountRef = useRef(messageCount);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    if (
      messageCount > prevMessageCountRef.current &&
      prevScrollHeightRef.current > 0
    ) {
      const added = el.scrollHeight - prevScrollHeightRef.current;
      if (added > 0 && el.scrollTop < 50) {
        el.scrollTop = added;
      }
    }
    prevScrollHeightRef.current = el.scrollHeight;
    prevMessageCountRef.current = messageCount;
  }, [messageCount]);

  const isNewMessage = useCallback(
    (id: string) => !initialIdsRef.current.has(id),
    [],
  );

  return {
    bottomRef,
    viewportRef,
    showScrollBtn,
    checkScrollPosition,
    scrollToBottom,
    isNewMessage,
  };
}
