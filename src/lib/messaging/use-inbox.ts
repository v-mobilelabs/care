"use client";
import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { getClientDatabase } from "@/lib/firebase/client";
import type { DmInboxEntry } from "./types";

/**
 * Subscribe to the current user's DM inbox.
 * Returns conversations sorted by most recent message first.
 */
export function useInbox(uid: string | null) {
  const [entries, setEntries] = useState<DmInboxEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

    const db = getClientDatabase();
    const inboxRef = ref(db, `dm-inbox/${uid}`);

    const unsub = onValue(
      inboxRef,
      (snap) => {
        const items: DmInboxEntry[] = [];
        snap.forEach((child) => {
          const val = child.val();
          items.push({
            conversationId: child.key!,
            otherUid: val.otherUid ?? "",
            otherName: val.otherName ?? "",
            lastMessage: val.lastMessage ?? "",
            lastMessageAt: val.lastMessageAt ?? 0,
            unread: typeof val.unread === "number" ? val.unread : 0,
          });
        });
        // Newest first
        items.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
        setEntries(items);
        setLoading(false);
      },
      () => {
        // Permission denied or network error — stop loading.
        setEntries([]);
        setLoading(false);
      },
    );

    return unsub;
  }, [uid]);

  // Null uid means no auth — return safe empty defaults at render time.
  if (!uid) return { entries: [] as DmInboxEntry[], loading: false };
  return { entries, loading };
}
