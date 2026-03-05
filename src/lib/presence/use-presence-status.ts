/**
 * usePresenceStatus — subscribe to another user's online/offline state.
 *
 * Usage (e.g. show a green dot next to a doctor's name):
 *   const { online, lastSeen } = usePresenceStatus(doctorUid);
 *
 * Returns `{ online: false, lastSeen: null, kind: null }` while loading or
 * when the uid is null/undefined.
 */
"use client";
import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { getClientDatabase } from "@/lib/firebase/client";
import type { UserKind } from "@/lib/auth/jwt";

export interface PresenceStatus {
  /** Whether the user currently has an active session. */
  online: boolean;
  /**
   * Unix-millisecond timestamp of when their presence was last updated.
   * Null until the first RTDB snapshot arrives.
   */
  lastSeen: number | null;
  kind: UserKind | null;
}

const INITIAL: PresenceStatus = { online: false, lastSeen: null, kind: null };

export function usePresenceStatus(
  uid: string | null | undefined,
): PresenceStatus {
  const [status, setStatus] = useState<PresenceStatus>(INITIAL);

  useEffect(() => {
    if (!uid) {
      setStatus(INITIAL);
      return;
    }

    const db = getClientDatabase();
    const presenceRef = ref(db, `presence/${uid}`);

    const unsubscribe = onValue(presenceRef, (snap) => {
      const data = snap.val() as PresenceStatus | null;
      setStatus(data ?? INITIAL);
    });

    return unsubscribe;
  }, [uid]);

  return status;
}
