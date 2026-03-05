/**
 * usePresence — manages the current user's online/offline state.
 *
 * Architecture:
 *   • POST /api/presence { online: true }  — Admin SDK write on mount.
 *     Reliable regardless of whether Firebase client Auth is fully established.
 *   • onDisconnect() registered via client RTDB — server-side cleanup on crash.
 *     Best-effort: only active once the RTDB client is authenticated.
 *   • POST /api/presence { online: false } — called on intentional sign-out.
 *
 * RTDB path: /presence/{uid}
 */
"use client";
import { useEffect } from "react";
import { ref, set, onDisconnect, serverTimestamp } from "firebase/database";
import { getClientDatabase } from "@/lib/firebase/client";
import type { UserKind } from "@/lib/auth/jwt";

async function writePresence(online: boolean): Promise<void> {
  try {
    await fetch("/api/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ online }),
    });
  } catch {
    // Best-effort — never throw from presence writes.
  }
}

export function usePresence(uid: string | null, kind: UserKind | null) {
  useEffect(() => {
    if (!uid || !kind) return;

    // 1. Server-side write — works before client RTDB auth is established.
    void writePresence(true);

    // 2. Best-effort: register onDisconnect via the client RTDB SDK.
    //    This fires on the server when the TCP connection drops (crash / tab close).
    //    It activates once the client RTDB is authenticated (after signInWithCustomToken).
    const db = getClientDatabase();
    const presenceRef = ref(db, `presence/${uid}`);
    const offlinePayload = { online: false, lastSeen: serverTimestamp(), kind };
    const disconnectRef = onDisconnect(presenceRef);
    void disconnectRef.set(offlinePayload).catch(() => {
      // RTDB not yet authenticated — onDisconnect will not be active.
      // The server write on sign-out (see cleanup below) still handles it.
    });

    return () => {
      // 3. Intentional sign-out / unmount — cancel server handler and mark offline.
      void disconnectRef.cancel().catch(() => {
        /* ignore */
      });
      void writePresence(false);
    };
  }, [uid, kind]);
}
