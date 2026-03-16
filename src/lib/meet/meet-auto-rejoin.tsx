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
import { useEffect, useRef, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { usePathname } from "next/navigation";
import { firebaseApp } from "@/lib/firebase/client";
import { useAuth } from "@/ui/providers/auth-provider";
import { useMeetSession } from "./meet-session-context";
import { useRTDBListener } from "@/lib/firebase/use-rtdb-listener";
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

function useDoctorRejoin(doctorId: string | null, authReady: boolean) {
    const { data } = useRTDBListener<Record<string, RtdbCallEntry>>(
        authReady && doctorId ? `call-requests/${doctorId}` : null
    );

    if (!data) return null;

    const accepted = Object.values(data).find(
        (e) => e.status === "accepted" && e.requestId,
    );
    return accepted?.requestId ?? null;
}

function usePatientRejoin(patientId: string | null, authReady: boolean) {
    const { data } = useRTDBListener<RtdbCallState>(
        authReady && patientId ? `call-state/${patientId}` : null
    );

    if (!data || data.status !== "accepted" || !data?.requestId) return null;
    return data.requestId;
}

export function MeetAutoRejoin() {
    const { user, kind, loading } = useAuth();
    const { state, startMeet } = useMeetSession();
    const pathname = usePathname();

    // Track whether we've already attempted a rejoin for this mount lifetime
    // to avoid firing multiple fetches if RTDB emits rapidly.
    const rejoinAttemptedRef = useRef<string | null>(null);

    // Wait for Firebase client Auth to be ready
    const [authReady, setAuthReady] = useState(false);
    useEffect(() => {
        if (!user || !kind) {
            setAuthReady(false);
            return;
        }

        const unsubAuth = onAuthStateChanged(
            getAuth(firebaseApp),
            (firebaseUser) => {
                setAuthReady(!!firebaseUser && firebaseUser.uid === user.uid);
            },
        );

        return unsubAuth;
    }, [user, kind]);

    // Get the requestId to rejoin based on user kind
    const doctorRequestId = useDoctorRejoin(
        kind === "doctor" ? (user?.uid ?? null) : null,
        authReady
    );
    const patientRequestId = usePatientRejoin(
        kind === "user" ? (user?.uid ?? null) : null,
        authReady
    );

    const requestIdToRejoin = kind === "doctor" ? doctorRequestId : patientRequestId;

    useEffect(() => {
        // Wait for auth to resolve
        if (loading || !user || !kind) return;
        // If overlay already has an active session, nothing to rejoin
        if (state.sessionData) return;
        // If the user is already on the /meet page, the lobby in MeetContent
        // will handle joining — don't auto-start the room behind it.
        if (pathname.startsWith("/meet/")) return;
        // No active call to rejoin
        if (!requestIdToRejoin) return;

        void attemptRejoin(requestIdToRejoin);

        async function attemptRejoin(requestId: string) {
            // Only attempt once per requestId per mount
            if (rejoinAttemptedRef.current === requestId) return;
            // Don't rejoin if overlay was started by another code path
            if (state.sessionData) return;
            rejoinAttemptedRef.current = requestId;

            try {
                const res = await fetch(`/api/meet/${requestId}/session`);

                // If meeting has ended (400/404), clear the RTDB state so we stop retrying
                if (!res.ok) {
                    if (res.status === 400 || res.status === 404) {
                        console.log("[MeetAutoRejoin] Meeting has ended, cleaning up RTDB state");
                        // Ensure user is still valid before cleanup
                        if (!user?.uid || !kind) return;

                        const { getClientDatabase } = await import("@/lib/firebase/client");
                        const db = getClientDatabase();
                        if (kind === "doctor") {
                            // Remove from doctor's call queue
                            await import("firebase/database").then(({ remove, ref }) =>
                                remove(ref(db, `call-requests/${user.uid}/${requestId}`))
                            );
                        } else {
                            // Update patient's call state to ended
                            await import("firebase/database").then(({ update, ref }) =>
                                update(ref(db, `call-state/${user.uid}`), { status: "ended" })
                            );
                        }
                    }
                    return;
                }

                const sessionData = (await res.json()) as MeetSessionData;

                // Restore mic/camera preferences persisted by the room on toggle.
                // Defaults to true if not found (first join).
                const micOn = sessionStorage.getItem(`callMicOn_${requestId}`) !== "false";
                const cameraOn = sessionStorage.getItem(`callCamOn_${requestId}`) !== "false";

                // Double-check overlay hasn't been started in the meantime
                startMeet(sessionData, { micOn, cameraOn });
            } catch (err) {
                // Network error — user can manually rejoin via Dynamic Island or /meet page
                console.error("[MeetAutoRejoin] Failed to rejoin:", err);
                rejoinAttemptedRef.current = null;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, user?.uid, kind, state.sessionData, pathname, requestIdToRejoin]);

    // This component is invisible — it only drives side effects.
    return null;
}
