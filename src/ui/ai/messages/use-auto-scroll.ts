import type { UIMessage } from "ai";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

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
  const lastMessageId = messages.at(-1)?.id;

  // Track whether the latest change was a prepend (older messages loaded).
  const prevLastMessageIdRef = useRef(lastMessageId);
  const wasPrependRef = useRef(false);

  // ── Native scroll listener (reliable for programmatic + user scrolls) ────
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    function handleScroll() {
      if (!el) return;
      const distanceFromBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(distanceFromBottom > SCROLL_THRESHOLD);
    }
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Auto-scroll to bottom only when already near the bottom
  // and the change was NOT a prepend (older messages loaded at top).
  useEffect(() => {
    if (wasPrependRef.current) {
      wasPrependRef.current = false;
      return;
    }
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

  // ── Detect prepend before auto-scroll (useLayoutEffect runs first) ─────
  const prevScrollHeightRef = useRef(0);
  const prevMessageCountRef = useRef(messageCount);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    // Detect prepend: message count grew but the last message didn't change.
    const isPrepend =
      messageCount > prevMessageCountRef.current &&
      prevLastMessageIdRef.current != null &&
      lastMessageId === prevLastMessageIdRef.current;

    if (isPrepend && prevScrollHeightRef.current > 0) {
      // Signal the auto-scroll useEffect to skip on this render.
      wasPrependRef.current = true;
      // Scroll up to show the newly loaded older messages.
      requestAnimationFrame(() => {
        el.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    prevScrollHeightRef.current = el.scrollHeight;
    prevMessageCountRef.current = messageCount;
    prevLastMessageIdRef.current = lastMessageId;
  }, [messageCount, lastMessageId]);

  const isNewMessage = useCallback(
    (id: string) => !initialIdsRef.current.has(id),
    [],
  );

  return {
    bottomRef,
    viewportRef,
    showScrollBtn,
    scrollToBottom,
    isNewMessage,
  };
}
