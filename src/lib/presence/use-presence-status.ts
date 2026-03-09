/**
 * usePresenceStatus — subscribe to another user's online/offline state.
 *
 * Usage (e.g. show a green dot next to a doctor's name):
 *   const { online, lastSeen } = usePresenceStatus(doctorUid);
 *
 * Returns `{ online: false, lastSeen: null, kind: null }` while loading or
 * when the uid is null/undefined.
 *
 * Note: Requires Firebase Auth to be signed in, otherwise RTDB reads will
 * fail with permission denied (database rules require auth != null).
 */
"use client";
import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { getClientDatabase, getClientAuth } from "@/lib/firebase/client";
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
  /**
   * Fine-grained activity state.
   * - "online"  — logged in and idle
   * - "busy"    — currently on a video call
   * Absent for users whose presence was written before this field was added.
   */
  status?: "online" | "busy";
  /**
   * True until the first RTDB snapshot arrives.
   * Consumers can use this to avoid showing a "definitely offline" indicator
   * while the subscription is still being established.
   */
  loading: boolean;
}

const INITIAL: PresenceStatus = {
  online: false,
  lastSeen: null,
  kind: null,
  loading: true,
};

export function usePresenceStatus(uid: string): PresenceStatus {
  const [status, setStatus] = useState<PresenceStatus>(INITIAL);

  // Then subscribe to presence data
  useEffect(() => {
    if (!uid) {
      console.log("usePresenceStatus: no uid provided");
      setStatus(INITIAL);
      return;
    }

    setStatus(INITIAL);

    const db = getClientDatabase();
    const presenceRef = ref(db, `presence/${uid}`);

    const unsubscribe = onValue(
      presenceRef,
      (snap) => {
        const data = snap.val() as Omit<PresenceStatus, "loading"> | null;
        setStatus(
          data ? { ...data, loading: false } : { ...INITIAL, loading: false },
        );
      },
      (error) => {
        console.error(
          "usePresenceStatus: error reading presence for uid",
          uid,
          error,
        );
        setStatus({ ...INITIAL, loading: false });
      },
    );

    return unsubscribe;
  }, [uid]);

  return status;
}
