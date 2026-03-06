"use client";
/**
 * useDoctorCallQueue — subscribes to incoming call requests for the logged-in doctor.
 * Listens to Firebase RTDB: /call-requests/{doctorId}
 *
 * Critically, the RTDB subscription is created only AFTER the Firebase client
 * Auth state is confirmed (via onAuthStateChanged). This prevents a race where
 * the subscription is set up before the client SDK is authenticated, causing a
 * silent permission-denied failure that never retries.
 */
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ref, onValue } from "firebase/database";
import { firebaseApp, getClientDatabase } from "@/lib/firebase/client";

export interface IncomingCallEntry {
  requestId: string;
  patientId: string;
  patientName: string;
  patientPhotoUrl?: string | null;
  status: "pending" | "accepted";
  createdAt: number;
}

export function useDoctorCallQueue(
  doctorId: string | null | undefined,
): IncomingCallEntry[] {
  const [queue, setQueue] = useState<IncomingCallEntry[]>([]);

  useEffect(() => {
    if (!doctorId) {
      setQueue([]);
      return;
    }

    let unsubscribeRtdb: (() => void) | null = null;

    // Wait for Firebase client Auth to be ready before subscribing.
    // onAuthStateChanged fires immediately if auth state is already resolved.
    const unsubscribeAuth = onAuthStateChanged(
      getAuth(firebaseApp),
      (firebaseUser) => {
        // Clean up any existing RTDB listener before re-subscribing.
        if (unsubscribeRtdb) {
          unsubscribeRtdb();
          unsubscribeRtdb = null;
        }

        // Only subscribe if the authenticated user matches the expected doctorId.
        if (!firebaseUser || firebaseUser.uid !== doctorId) {
          setQueue([]);
          return;
        }

        const db = getClientDatabase();
        const queueRef = ref(db, `call-requests/${doctorId}`);

        unsubscribeRtdb = onValue(
          queueRef,
          (snap) => {
            const data = snap.val() as Record<string, IncomingCallEntry> | null;
            if (!data) {
              setQueue([]);
              return;
            }
            const entries = Object.values(data)
              // Keep "accepted" entries too — the accept API updates the RTDB
              // entry to "accepted" before returning the HTTP response. The
              // WebSocket can propagate this change before the HTTP response
              // arrives, which would otherwise unmount IncomingCallCard and
              // destroy the TanStack mutation observer before onSuccess fires.
              .filter((e) => e.status === "pending" || e.status === "accepted")
              .sort((a, b) => a.createdAt - b.createdAt);
            setQueue(entries);
          },
          (error) => {
            // Permission denied or network error — clear queue and log.
            console.warn("[useDoctorCallQueue] RTDB error:", error.message);
            setQueue([]);
          },
        );
      },
    );

    return () => {
      unsubscribeAuth();
      if (unsubscribeRtdb) unsubscribeRtdb();
    };
  }, [doctorId]);

  return queue;
}
