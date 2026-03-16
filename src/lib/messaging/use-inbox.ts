"use client";
import { useRTDBListener } from "@/lib/firebase/use-rtdb-listener";
import type { DmInboxEntry } from "./types";

/**
 * Subscribe to the current user's DM inbox.
 * Returns conversations sorted by most recent message first.
 */
export function useInbox(uid: string | null) {
  const { data, loading } = useRTDBListener<Record<string, unknown>>(
    uid ? `dm-inbox/${uid}` : null,
  );

  if (!uid) return { entries: [] as DmInboxEntry[], loading: false };

  if (!data) return { entries: [] as DmInboxEntry[], loading };

  const items: DmInboxEntry[] = Object.entries(data).map(([key, val]) => {
    const v = val as Record<string, unknown>;
    return {
      conversationId: key,
      otherUid: (v.otherUid as string) ?? "",
      otherName: (v.otherName as string) ?? "",
      lastMessage: (v.lastMessage as string) ?? "",
      lastMessageAt: (v.lastMessageAt as number) ?? 0,
      unread: typeof v.unread === "number" ? v.unread : 0,
    };
  });

  // Newest first
  items.sort((a, b) => b.lastMessageAt - a.lastMessageAt);

  return { entries: items, loading };
}
