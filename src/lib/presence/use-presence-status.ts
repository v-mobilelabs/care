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
import { useRTDBListener } from "@/lib/firebase/use-rtdb-listener";
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
  const { data, loading, error } = useRTDBListener<
    Omit<PresenceStatus, "loading">
  >(uid ? `presence/${uid}` : null);

  if (error) {
    console.error(
      "usePresenceStatus: error reading presence for uid",
      uid,
      error,
    );
  }

  if (!uid) {
    return INITIAL;
  }

  return data ? { ...data, loading } : { ...INITIAL, loading };
}
