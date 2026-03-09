"use client";
import { useEffect, useRef, useState } from "react";
import {
  ref,
  onValue,
  query,
  orderByKey,
  limitToLast,
} from "firebase/database";
import { getClientDatabase } from "@/lib/firebase/client";
import { markAsRead } from "./actions";
import type { DmMessage } from "./types";

/**
 * Subscribe to messages in a conversation (most recent N).
 * Messages are returned in chronological order (oldest → newest).
 *
 * When `viewerUid` is provided, the conversation's unread flag is
 * automatically reset every time new messages arrive while the user
 * is viewing the thread.
 */
export function useMessages(
  conversationId: string | null,
  limit = 200,
  viewerUid?: string | null,
) {
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Track the previous message count so we only call markAsRead when
  // the snapshot actually changes (avoids redundant RTDB writes).
  const prevCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    // Reset on conversation change.
    prevCountRef.current = null;

    const db = getClientDatabase();
    const messagesRef = query(
      ref(db, `dm/${conversationId}/messages`),
      orderByKey(),
      limitToLast(limit),
    );

    const unsub = onValue(
      messagesRef,
      (snap) => {
        const msgs: DmMessage[] = [];
        snap.forEach((child) => {
          const val = child.val();
          msgs.push({
            id: child.key!,
            senderId: val.senderId ?? "",
            text: val.text ?? "",
            createdAt: val.createdAt ?? 0,
          });
        });
        setMessages(msgs);
        setLoading(false);

        // Auto-reset unread count when the viewer is actively
        // subscribed to this conversation and new messages arrived.
        if (
          viewerUid &&
          conversationId &&
          msgs.length > 0 &&
          prevCountRef.current !== null &&
          msgs.length > prevCountRef.current
        ) {
          void markAsRead(viewerUid, conversationId);
        }
        // First snapshot — also reset (user just opened the thread).
        if (
          viewerUid &&
          conversationId &&
          prevCountRef.current === null &&
          msgs.length > 0
        ) {
          void markAsRead(viewerUid, conversationId);
        }
        prevCountRef.current = msgs.length;
      },
      () => {
        // Permission denied or network error — stop loading.
        setMessages([]);
        setLoading(false);
      },
    );

    return unsub;
  }, [conversationId, limit, viewerUid]);

  // No active conversation — return safe empty defaults at render time.
  if (!conversationId) return { messages: [] as DmMessage[], loading: false };
  return { messages, loading };
}
