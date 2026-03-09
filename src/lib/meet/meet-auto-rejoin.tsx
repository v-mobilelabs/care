"use client";
/**
 * MeetAutoRejoin — automatically rejoins an active call after page reload.
 *
 * Mounted inside the root layout (within AuthProvider + MeetSessionProvider).
 * On mount, it checks Firebase RTDB for an active (status === "accepted") call:
 *   - Doctor: reads `/call-requests/{doctorId}` for an accepted entry
 *   - Patient: reads `/call-state/{patientId}` for accepted status
 *
 * If found and the persistent overlay has no active session yet, it fetches
 * fresh Chime tokens from `/api/meet/{requestId}/session` and calls
 * `startMeet()` to seamlessly resume the call.
 *
 * **Exception:** if the user is already on the `/meet/{requestId}` page, this
 * component does nothing — the MeetContent lobby will handle joining so the
 * user can configure mic/camera before re-entering the call.
 */
import { useEffect, useRef } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ref, onValue, type Unsubscribe } from "firebase/database";
import { usePathname } from "next/navigation";
import { firebaseApp, getClientDatabase } from "@/lib/firebase/client";
import { useAuth } from "@/ui/providers/auth-provider";
import { useMeetSession } from "./meet-session-context";
import type { MeetSessionData } from "@/app/(portal)/meet/[requestId]/_keys";

/** Minimal shape of the RTDB call-requests entry (doctor side). */
interface RtdbCallEntry {
    requestId: string;
    status: "pending" | "accepted";
}

/** Minimal shape of the RTDB call-state node (patient side). */
interface RtdbCallState {
    status: string;
    requestId?: string;
}

export function MeetAutoRejoin() {
    const { user, kind, loading } = useAuth();
    const { state, startMeet } = useMeetSession();
    const pathname = usePathname();

    // Track whether we've already attempted a rejoin for this mount lifetime
    // to avoid firing multiple fetches if RTDB emits rapidly.
    const rejoinAttemptedRef = useRef<string | null>(null);

    useEffect(() => {
        // Wait for auth to resolve
        if (loading || !user || !kind) return;
        // If overlay already has an active session, nothing to rejoin
        if (state.sessionData) return;
        // If the user is already on the /meet page, the lobby in MeetContent
        // will handle joining — don't auto-start the room behind it.
        if (pathname.startsWith("/meet/")) return;

        let unsubRtdb: Unsubscribe | null = null;
        let cancelled = false;

        const unsubAuth = onAuthStateChanged(
            getAuth(firebaseApp),
            (firebaseUser) => {
                // Clean up previous RTDB listener
                if (unsubRtdb) {
                    unsubRtdb();
                    unsubRtdb = null;
                }

                if (!firebaseUser || firebaseUser.uid !== user.uid) return;

                const db = getClientDatabase();

                if (kind === "doctor") {
                    // Doctor: scan /call-requests/{doctorId} for an accepted entry
                    const queueRef = ref(db, `call-requests/${user.uid}`);
                    unsubRtdb = onValue(
                        queueRef,
                        (snap) => {
                            if (cancelled) return;
                            const data = snap.val() as Record<string, RtdbCallEntry> | null;
                            if (!data) return;

                            const accepted = Object.values(data).find(
                                (e) => e.status === "accepted" && e.requestId,
                            );
                            if (accepted) {
                                void attemptRejoin(accepted.requestId);
                            }
                        },
                        () => { /* permission error — ignore */ },
                    );
                } else {
                    // Patient: read /call-state/{patientId}
                    const callRef = ref(db, `call-state/${user.uid}`);
                    unsubRtdb = onValue(
                        callRef,
                        (snap) => {
                            if (cancelled) return;
                            const data = snap.val() as RtdbCallState | null;
                            if (!data || data.status !== "accepted" || !data?.requestId) return;
                            void attemptRejoin(data.requestId);
                        },
                        () => { /* permission error — ignore */ },
                    );
                }
            },
        );

        async function attemptRejoin(requestId: string) {
            // Only attempt once per requestId per mount
            if (rejoinAttemptedRef.current === requestId) return;
            // Don't rejoin if overlay was started by another code path
            if (state.sessionData) return;
            rejoinAttemptedRef.current = requestId;

            try {
                const res = await fetch(`/api/meet/${requestId}/session`);
                if (!res.ok || cancelled) return;
                const sessionData = (await res.json()) as MeetSessionData;
                if (cancelled) return;

                // Restore mic/camera preferences persisted by the room on toggle.
                // Defaults to true if not found (first join).
                const micOn = sessionStorage.getItem(`callMicOn_${requestId}`) !== "false";
                const cameraOn = sessionStorage.getItem(`callCamOn_${requestId}`) !== "false";

                // Double-check overlay hasn't been started in the meantime
                startMeet(sessionData, { micOn, cameraOn });
            } catch {
                // Network error — user can manually rejoin via Dynamic Island or /meet page
                rejoinAttemptedRef.current = null;
            }
        }

        return () => {
            cancelled = true;
            unsubAuth();
            if (unsubRtdb) unsubRtdb();
        };
        // Only re-run when auth resolves, overlay state changes, or pathname changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, user?.uid, kind, state.sessionData === null, pathname]);

    // This component is invisible — it only drives side effects.
    return null;
}
