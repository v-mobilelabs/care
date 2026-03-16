"use client";
import { useEffect, useRef } from "react";
import { ref, set, remove } from "firebase/database";
import { getClientDatabase } from "@/lib/firebase/client";
import { useRTDBListener } from "@/lib/firebase/use-rtdb-listener";

const TYPING_TIMEOUT_MS = 2_000;

/**
 * Manage the typing indicator for a conversation.
 *
 * - Call `setTyping()` on every keystroke (auto-clears after 2 s of inactivity).
 * - `otherTyping` is true when the remote participant is typing.
 */
export function useTyping(
  conversationId: string | null,
  myUid: string | null,
  otherUid: string | null,
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Listen to the other user's typing node ─────────────────────────────────
  const { data: otherTypingData } = useRTDBListener<boolean>(
    conversationId && otherUid
      ? `dm/${conversationId}/typing/${otherUid}`
      : null,
  );

  // ── Clean up own typing indicator on unmount ───────────────────────────────
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (conversationId && myUid) {
        const db = getClientDatabase();
        void remove(ref(db, `dm/${conversationId}/typing/${myUid}`));
      }
    };
  }, [conversationId, myUid]);

  /** Signal that the current user is typing. Debounced — safe to call per-keystroke. */
  function startTyping() {
    if (!conversationId || !myUid) return;

    const db = getClientDatabase();
    const typingRef = ref(db, `dm/${conversationId}/typing/${myUid}`);
    void set(typingRef, true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      void remove(typingRef);
    }, TYPING_TIMEOUT_MS);
  }

  /** Immediately clear the typing indicator (e.g. after sending a message). */
  function clearTyping() {
    if (!conversationId || !myUid) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const db = getClientDatabase();
    void remove(ref(db, `dm/${conversationId}/typing/${myUid}`));
  }

  // When prerequisites are missing, report not-typing.
  const otherTyping =
    conversationId && otherUid ? otherTypingData === true : false;
  return { otherTyping, startTyping, clearTyping };
}
