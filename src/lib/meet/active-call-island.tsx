"use client";
/**
 * ActiveCallIsland — iOS Dynamic Island-style badge shown at the top centre
 * of the screen when the doctor has an active call.
 *
 * Mounted in the ROOT layout so it persists across ALL navigations — it will
 * never remount until the page is hard-reloaded. Shows patient avatar + live
 * elapsed timer. Clicking expands the persistent meet overlay (or navigates
 * to the meet page if a fresh session is needed).
 *
 * Performance optimisations:
 *  - Prefetches the `/meet/{requestId}` route on mount (JS bundle + RSC).
 *  - Prefetches session data into TanStack Query cache (refreshes Chime token).
 *  - Shows an instant "Joining…" spinner on click for immediate feedback.
 */
import { Avatar, Box, Group, Loader, Text, UnstyledButton } from "@mantine/core";
import { IconPhoneCall, IconVideo } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/ui/providers/auth-provider";
import { useDoctorCallQueue } from "@/lib/meet/use-doctor-call-queue";
import { getInitials } from "@/lib/get-initials";
import { meetSessionKey, type MeetSessionData } from "@/app/(portal)/meet/[requestId]/_keys";
import { useMeetSession } from "@/lib/meet/meet-session-context";

// ── Timer helper ──────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// ── Dynamic Island ────────────────────────────────────────────────────────────

export function ActiveCallIsland() {
    const { user, kind } = useAuth();
    const queue = useDoctorCallQueue(kind === "doctor" ? user?.uid : undefined);
    const router = useRouter();
    const queryClient = useQueryClient();
    const { state: meetState, expand } = useMeetSession();

    // ── Track locally-ended calls ───────────────────────────────────────────
    // When `endMeet()` is called the overlay sessionData becomes null instantly,
    // but the RTDB `/call-requests` entry lingers until the server removes it.
    // We capture the requestId that just ended so the island can hide immediately
    // instead of waiting for the RTDB round-trip.
    const prevSessionRef = useRef<string | null>(null);
    const [endedRequestId, setEndedRequestId] = useState<string | null>(null);

    useEffect(() => {
        const currentRequestId = meetState.sessionData?.requestId ?? null;
        // Transition from having a session → not having one means endMeet() was called
        if (prevSessionRef.current && !currentRequestId) {
            setEndedRequestId(prevSessionRef.current);
        }
        prevSessionRef.current = currentRequestId;
    }, [meetState.sessionData?.requestId]);

    // Clear the endedRequestId once RTDB catches up and removes the entry
    useEffect(() => {
        if (endedRequestId && !queue.some((c) => c.requestId === endedRequestId)) {
            setEndedRequestId(null);
        }
    }, [endedRequestId, queue]);

    const activeCall = queue.find(
        (c) => c.status === "accepted" && c.requestId !== endedRequestId,
    ) ?? null;

    // ── Live timer ──────────────────────────────────────────────────────────
    const [elapsed, setElapsed] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!activeCall) {
            setElapsed(0);
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
        }

        const startedAt = activeCall.createdAt;
        const calcElapsed = () =>
            Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
        setElapsed(calcElapsed());

        intervalRef.current = setInterval(() => setElapsed(calcElapsed()), 1000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [activeCall]);

    // ── Prefetch route + seed TanStack cache when island appears ──────────
    const prefetchedRef = useRef<string | null>(null);

    useEffect(() => {
        if (!activeCall) {
            prefetchedRef.current = null;
            return;
        }

        const meetPath = `/meet/${activeCall.requestId}`;

        // Only prefetch once per requestId
        if (prefetchedRef.current === activeCall.requestId) return;
        prefetchedRef.current = activeCall.requestId;

        // 1. Prefetch the Next.js route (JS bundle + RSC payload)
        router.prefetch(meetPath);

        // 2. Prefetch full session data into TanStack Query cache so the
        //    MeetContent component has data instantly when the doctor clicks.
        queryClient.prefetchQuery({
            queryKey: meetSessionKey(activeCall.requestId),
            queryFn: async () => {
                const res = await fetch(
                    `/api/meet/${activeCall.requestId}/session`,
                );
                if (!res.ok) throw new Error("Failed to prefetch session");
                return res.json() as Promise<MeetSessionData>;
            },
            staleTime: Infinity,
        });
    }, [activeCall, router, queryClient]);

    // ── Click state ─────────────────────────────────────────────────────────
    const [joining, setJoining] = useState(false);
    const [hovered, setHovered] = useState(false);

    // Reset joining state when the active call changes (e.g. call ended)
    // or when the overlay mode changes (e.g. call successfully joined/expanded).
    useEffect(() => {
        setJoining(false);
    }, [activeCall?.requestId, meetState.mode]);

    // Don't render when there's no active call, or when the overlay is
    // already expanded (avoids overlapping the meet header).
    if (!activeCall) return null;
    if (meetState.mode === "expanded") return null;

    const handleClick = () => {
        // If the persistent overlay already has the session alive, just expand
        // it instantly — no navigation or SSR round-trip needed.
        if (meetState.sessionData?.requestId === activeCall.requestId) {
            expand();
            return;
        }
        // Otherwise navigate to the meet page so SSR fetches fresh tokens.
        setJoining(true);
        router.push(`/meet/${activeCall.requestId}`);
    };

    return (
        <Box
            style={{
                position: "fixed",
                top: 8,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 10000,
                pointerEvents: "auto",
            }}
        >
            <style>{`
                @keyframes di-appear {
                    from { transform: scaleX(0.3) scaleY(0.6); opacity: 0; }
                    to   { transform: scaleX(1) scaleY(1);     opacity: 1; }
                }
                @keyframes di-pulse-dot {
                    0%, 100% { opacity: 1; }
                    50%      { opacity: 0.4; }
                }
            `}</style>
            <UnstyledButton
                onClick={handleClick}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                disabled={joining}
                aria-label={`Active call with ${activeCall.patientName} — click to expand`}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    height: 36,
                    paddingLeft: 4,
                    paddingRight: 12,
                    borderRadius: 20,
                    background: "light-dark(#1a1a1a, #1a1a1a)",
                    color: "#fff",
                    cursor: joining ? "wait" : "pointer",
                    animation: "di-appear 0.4s cubic-bezier(0.34,1.36,0.64,1) both",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    transform: hovered && !joining ? "scale(1.04)" : "scale(1)",
                    boxShadow: hovered
                        ? "0 4px 20px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)"
                        : "0 2px 10px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.06)",
                    opacity: joining ? 0.85 : 1,
                }}
            >
                {/* Patient avatar with live dot */}
                <Box style={{ position: "relative", flexShrink: 0 }}>
                    <Avatar
                        size={28}
                        radius="xl"
                        src={activeCall.patientPhotoUrl ?? undefined}
                        style={{
                            border: "2px solid rgba(52,199,89,0.6)",
                            background: activeCall.patientPhotoUrl
                                ? undefined
                                : "rgba(255,255,255,0.1)",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "rgba(255,255,255,0.85)",
                        }}
                    >
                        {!activeCall.patientPhotoUrl && getInitials(activeCall.patientName)}
                    </Avatar>
                    {/* Live green dot */}
                    <Box
                        style={{
                            position: "absolute",
                            bottom: -1,
                            right: -1,
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: "#34C759",
                            border: "2px solid #1a1a1a",
                            animation: "di-pulse-dot 2s ease-in-out infinite",
                        }}
                    />
                </Box>

                {/* Timer + label */}
                <Group gap={6} wrap="nowrap">
                    {joining ? (
                        <Loader size={12} color="#34C759" />
                    ) : (
                        <IconPhoneCall size={13} color="#34C759" />
                    )}
                    <Text
                        size="xs"
                        fw={600}
                        style={{
                            color: "#34C759",
                            fontVariantNumeric: "tabular-nums",
                            letterSpacing: 0.3,
                        }}
                    >
                        {joining ? "Joining…" : formatDuration(elapsed)}
                    </Text>
                </Group>

                {/* Expand hint on hover */}
                {hovered && !joining && (
                    <Group
                        gap={4}
                        wrap="nowrap"
                        style={{
                            animation: "di-appear 0.15s ease-out",
                        }}
                    >
                        <IconVideo size={13} color="rgba(255,255,255,0.8)" />
                        <Text
                            size="xs"
                            fw={500}
                            style={{ color: "rgba(255,255,255,0.8)" }}
                        >
                            Expand
                        </Text>
                    </Group>
                )}
            </UnstyledButton>
        </Box>
    );
}
