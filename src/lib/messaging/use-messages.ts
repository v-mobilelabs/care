"use client";
import { useEffect, useRef } from "react";
import { useRTDBListener } from "@/lib/firebase/use-rtdb-listener";
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
  const { data, loading } = useRTDBListener<Record<string, unknown>>(
    conversationId ? `dm/${conversationId}/messages` : null,
    {
      pageSize: limit,
      orderBy: { type: "key" },
      orderDirection: "asc",
    },
  );

  // Track the previous message count so we only call markAsRead when
  // the snapshot actually changes (avoids redundant RTDB writes).
  const prevCountRef = useRef<number | null>(null);

  const messages: DmMessage[] = data
    ? Object.entries(data).map(([key, val]) => {
        const v = val as Record<string, unknown>;
        return {
          id: key,
          senderId: (v.senderId as string) ?? "",
          text: (v.text as string) ?? "",
          createdAt: (v.createdAt as number) ?? 0,
        };
      })
    : [];

  // Auto-reset unread count when the viewer is actively
  // subscribed to this conversation and new messages arrived.
  useEffect(() => {
    if (
      viewerUid &&
      conversationId &&
      messages.length > 0 &&
      prevCountRef.current !== null &&
      messages.length > prevCountRef.current
    ) {
      void markAsRead(viewerUid, conversationId);
    }
    // First snapshot — also reset (user just opened the thread).
    if (
      viewerUid &&
      conversationId &&
      prevCountRef.current === null &&
      messages.length > 0
    ) {
      void markAsRead(viewerUid, conversationId);
    }
    prevCountRef.current = messages.length;
  }, [messages.length, viewerUid, conversationId]);

  // No active conversation — return safe empty defaults at render time.
  if (!conversationId) return { messages: [] as DmMessage[], loading: false };
  return { messages, loading };
}
