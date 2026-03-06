/**
 * usePresence — manages the current user's online/offline state.
 *
 * Architecture:
 *   • `.info/connected` listener re-fires on every RTDB reconnect, so the
 *     presence node is always refreshed (not just on first mount).
 *   • onDisconnect() is re-registered on each reconnect — the server marks
 *     the user offline the instant the TCP connection drops.
 *   • POST /api/presence { online: true } is a supplementary write via
 *     Admin SDK that also mirrors availability into Firestore for doctors.
 *   • On unmount / sign-out, POST /api/presence { online: false } is called.
 *
 * RTDB path: /presence/{uid}
 */
"use client";
import { useEffect, useRef } from "react";
import {
  ref,
  set,
  onDisconnect,
  onValue,
  serverTimestamp,
} from "firebase/database";
import { getClientDatabase } from "@/lib/firebase/client";
import type { UserKind } from "@/lib/auth/jwt";

/**
 * Write presence via the server API route (Admin SDK).
 * Returns the AbortController so callers can cancel in-flight requests.
 */
function writePresenceApi(online: boolean): AbortController {
  const controller = new AbortController();
  fetch("/api/presence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ online }),
    signal: controller.signal,
  }).catch(() => {
    // Best-effort — never throw from presence writes.
  });
  return controller;
}

export function usePresence(uid: string | null, kind: UserKind | null) {
  // Track the latest AbortController so Strict-Mode cleanup can cancel
  // the in-flight "online" request before a stale "offline" request is sent.
  const apiControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!uid || !kind) return;

    const db = getClientDatabase();
    const presenceRef = ref(db, `presence/${uid}`);
    const connectedRef = ref(db, ".info/connected");

    const onlinePayload = { online: true, lastSeen: serverTimestamp(), kind };
    const offlinePayload = { online: false, lastSeen: serverTimestamp(), kind };

    // ── Reconnect-aware presence ────────────────────────────────────
    // `.info/connected` fires every time the RTDB WebSocket (re)connects.
    // On each connection we:
    //   1. Register an onDisconnect handler (server-side cleanup).
    //   2. Write online state via the client SDK (instant).
    //   3. Mirror to Firestore via the API route (supplementary).
    const unsubConnected = onValue(connectedRef, (snap) => {
      if (snap.val() !== true) return;

      // Register onDisconnect FIRST — if the connection drops between
      // here and the set() below, the server still cleans up.
      onDisconnect(presenceRef)
        .set(offlinePayload)
        .then(() => set(presenceRef, onlinePayload))
        .catch(() => {
          // Client RTDB not yet authenticated — fall through to API write.
        });

      // Supplementary: API route mirrors to Firestore for doctor availability.
      apiControllerRef.current?.abort();
      apiControllerRef.current = writePresenceApi(true);
    });

    return () => {
      unsubConnected();

      // Cancel any in-flight "online" API request so it cannot arrive
      // after the "offline" request below (prevents Strict-Mode race).
      apiControllerRef.current?.abort();

      // Mark offline via API (Admin SDK) — reliable even if the RTDB
      // client is no longer connected.
      writePresenceApi(false);
    };
  }, [uid, kind]);
}
