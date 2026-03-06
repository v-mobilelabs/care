/**
 * useOnlineCount — subscribe to multiple users' presence and return
 * the number currently online (status "online" or "busy").
 *
 * Usage:
 *   const onlineCount = useOnlineCount(["uid1", "uid2", "uid3"]);
 */
"use client";
import { useEffect, useState } from "react";
import { ref, onValue, type Unsubscribe } from "firebase/database";
import { getClientDatabase } from "@/lib/firebase/client";

export function useOnlineCount(uids: readonly string[]): number {
  const [onlineSet, setOnlineSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (uids.length === 0) {
      setOnlineSet(new Set());
      return;
    }

    const db = getClientDatabase();
    const unsubs: Unsubscribe[] = [];

    for (const uid of uids) {
      const presenceRef = ref(db, `presence/${uid}`);
      const unsub = onValue(presenceRef, (snap) => {
        const data = snap.val() as { online?: boolean } | null;
        setOnlineSet((prev) => {
          const next = new Set(prev);
          if (data?.online) {
            next.add(uid);
          } else {
            next.delete(uid);
          }
          return next;
        });
      });
      unsubs.push(unsub);
    }

    return () => unsubs.forEach((u) => u());
  }, [uids.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return onlineSet.size;
}
