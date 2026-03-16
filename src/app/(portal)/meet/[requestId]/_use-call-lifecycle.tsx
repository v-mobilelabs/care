"use client";
/**
 * _use-call-lifecycle.ts — Hook for managing call teardown and end signals.
 */
import { notifications } from "@mantine/notifications";
import { ref as dbRef, set as dbSet, update as dbUpdate } from "firebase/database";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import type { DefaultMeetingSession } from "amazon-chime-sdk-js";
import { getClientDatabase } from "@/lib/firebase/client";
import { useRTDBListener } from "@/lib/firebase/use-rtdb-listener";
import { stopSession } from "./_room-helpers";
import type { TeardownReason } from "./_room-types"; // canonical definition in _room-types.ts

interface UseCallLifecycleParams {
    requestId: string;
    exitRoute: string;
    userKind: "patient" | "doctor";
    localUserId: string;
    sessionRef: React.RefObject<DefaultMeetingSession | null>;
    stoppedByUsRef: React.RefObject<boolean>;
    callStartTimeRef: React.RefObject<number>;
    onEnd?: () => void;
    onFeedbackOpen: (exitRoute: string, reason: string) => void;
}

export type { TeardownReason }; // re-export for backward compat

interface CallLifecycleState {
    teardownCalledRef: React.RefObject<boolean>;
    teardown: (reason: TeardownReason) => void;
    handleEnd: () => void;
}

/**
 * Manages call teardown (idempotent cleanup), end signals via RTDB,
 * and navigation/feedback flow after the call ends.
 */
export function useCallLifecycle({
    requestId,
    exitRoute,
    userKind,
    localUserId,
    sessionRef,
    stoppedByUsRef,
    callStartTimeRef,
    onEnd,
    onFeedbackOpen,
}: UseCallLifecycleParams): CallLifecycleState {
    const router = useRouter();
    const teardownCalledRef = useRef(false);

    // ── Consolidated teardown ────────────────────────────────────────────────
    // Idempotent: safe to call from handleEnd, RTDB listener, OR Chime observer.
    // Only the first invocation runs; subsequent calls are no-ops.
    const teardown = useCallback((reason: TeardownReason) => {
        if (teardownCalledRef.current) return;
        teardownCalledRef.current = true;
        stoppedByUsRef.current = true;

        const durationSeconds = Math.round(
            (Date.now() - callStartTimeRef.current) / 1000,
        );

        // Clear persisted session state
        sessionStorage.removeItem(`callStartedAt_${requestId}`);
        sessionStorage.removeItem(`callMicOn_${requestId}`);
        sessionStorage.removeItem(`callCamOn_${requestId}`);

        // Release Chime media resources
        const sess = sessionRef.current;
        if (sess) {
            sessionRef.current = null;
            void stopSession(sess);
        }

        // Notification
        const message = (() => {
            if (reason === "chime-kicked") return "You joined this call on another device or tab.";
            if (reason === "user") return "You ended the call.";
            return "The other person ended the call.";
        })();
        notifications.show({
            title: reason === "chime-kicked" ? "Joined from another device" : "Call ended",
            message,
            color: reason === "chime-kicked" ? "yellow" : "gray",
        });

        // Show feedback modal for normal call ends (not kicked scenarios).
        // For kicks, navigate immediately since it's not the user's choice.
        if (reason === "chime-kicked") {
            // Clean up overlay immediately for kicks
            onEnd?.();
            router.push(exitRoute);
        } else {
            // For normal ends, show feedback modal first
            // onEnd() will be called after the modal is dismissed
            onFeedbackOpen(exitRoute, reason);
        }

        // Fire-and-forget async cleanup ──────────────────────────────────
        // ① RTDB signal for the other participant (only when WE ended)
        if (reason === "user") {
            void dbSet(
                dbRef(getClientDatabase(), `call-ended/${requestId}/${localUserId}`),
                true,
            ).catch((err: unknown) => console.error("[call-end] RTDB write FAILED", err));
        }

        // ② Server-side cleanup (only when user-initiated or Chime observer;
        //    when remote-rtdb fires, the other party already called the API)
        if (reason === "user" || reason === "chime-ended") {
            void fetch(`/api/meet/${requestId}/end`, {
                method: "POST",
                keepalive: true,
            }).catch((err: unknown) => console.error("[call-end] API call FAILED", err));
        }

        // ③ Optimistic patient call-state update
        if (userKind === "patient") {
            void dbUpdate(
                dbRef(getClientDatabase(), `call-state/${localUserId}`),
                { status: "ended" },
            );
        }
    }, [exitRoute, localUserId, onEnd, onFeedbackOpen, requestId, router, userKind, sessionRef, stoppedByUsRef, callStartTimeRef]);

    // ── RTDB listener for remote call-end ─────────────────────────────────
    // When either participant clicks End, their client writes
    // /call-ended/{requestId}/{theirUid} = true BEFORE calling the server
    // API. This listener detects that write and tears down the local
    // session — it works even if Chime's MeetingEnded signal is slow
    // or the server API hasn't completed yet.
    const { data: callEndedData } = useRTDBListener<Record<string, boolean>>(
        `call-ended/${requestId}`
    );

    useEffect(() => {
        if (!callEndedData) return;

        // Check if the OTHER participant wrote a child here.
        const otherEnded = Object.keys(callEndedData).some(
            (uid) => uid !== localUserId && callEndedData[uid] === true,
        );
        if (!otherEnded) return;

        // Idempotent — teardown no-ops if already called.
        teardown("remote-rtdb");
    }, [callEndedData, localUserId, teardown]);

    // ── End call ────────────────────────────────────────────────────────────
    const handleEnd = useCallback(() => {
        teardown("user");
    }, [teardown]);

    return {
        teardownCalledRef,
        teardown,
        handleEnd,
    };
}
