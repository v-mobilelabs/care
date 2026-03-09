"use client";
/**
 * MeetContent — bridge between the SSR page and the PersistentMeetOverlay.
 *
 * This component does NOT render the room itself. Instead it:
 *  1. Reads session data from TanStack Query cache (hydrated by the SSR page).
 *  2. If the call is still pending (joinInfo === null), shows a combined
 *     waiting-room + camera-preview lobby so the patient lands here in one tap.
 *  3. When RTDB pushes joinInfo (doctor accepted), transitions to the
 *     Teams-style pre-join lobby.
 *  4. Signals the global MeetSessionProvider to start/expand the overlay
 *     once the user clicks "Join now".
 *
 * The actual MeetingRoom is rendered by PersistentMeetOverlay in the root
 * layout, so it survives route navigations and keeps the call alive.
 */
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Center, Group, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconX } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { ref, remove } from "firebase/database";
import { PreJoinLobby, type LobbyResult } from "./_lobby";
import { WaitingLobby } from "./_waiting-lobby";
import { meetSessionKey, type MeetSessionData } from "./_keys";
import { useMeetSession } from "@/lib/meet/meet-session-context";
import { useCallState } from "@/lib/meet/use-call-state";
import { useAuth } from "@/ui/providers/auth-provider";
import { useCancelCall } from "@/app/(portal)/chat/connect/_query";
import { getClientDatabase } from "@/lib/firebase/client";

export function MeetContent({
    requestId,
}: Readonly<{ requestId: string }>) {
    const { state, startMeet, expand } = useMeetSession();
    const { user } = useAuth();
    const router = useRouter();
    const qc = useQueryClient();

    // Read from TanStack cache — seeded by SSR Hydrate or by the Dynamic
    // Island's prefetch. queryFn fetches from the API as a fallback (e.g.
    // hard refresh with empty cache).
    const { data: session, isLoading } = useQuery<MeetSessionData>({
        queryKey: meetSessionKey(requestId),
        queryFn: async () => {
            const res = await fetch(`/api/meet/${requestId}/session`);
            if (!res.ok) throw new Error("Failed to load meeting session");
            return res.json() as Promise<MeetSessionData>;
        },
        staleTime: Infinity,
    });

    const [joined, setJoined] = useState(false);
    const cancel = useCancelCall();

    // ── Watch RTDB for call acceptance (patient-only, pending calls) ─────
    const callState = useCallState(session?.userKind === "patient" ? user?.uid : undefined);

    // When RTDB pushes joinInfo after doctor accepts, update session cache
    useEffect(() => {
        if (
            callState.status === "accepted" &&
            callState.joinInfo &&
            session &&
            !session.joinInfo
        ) {
            const updated: MeetSessionData = { ...session, joinInfo: callState.joinInfo };
            qc.setQueryData(meetSessionKey(requestId), updated);
        }
    }, [callState.status, callState.joinInfo, session, requestId, qc]);

    // Call declined / cancelled by doctor — navigate back
    useEffect(() => {
        if (
            session &&
            !session.joinInfo &&
            callState.status === "rejected" &&
            user?.uid
        ) {
            notifications.show({
                title: "Call declined",
                message: "The doctor is unavailable. Please try another doctor.",
                color: "red",
                icon: <IconX size={18} />,
            });
            // Clean up the rejected status from RTDB and navigate back
            const cleanupAndNavigate = async () => {
                try {
                    const db = getClientDatabase();
                    await remove(ref(db, `call-state/${user.uid}`));
                } catch (err) {
                    console.warn("[MeetContent] Failed to cleanup rejected state:", err);
                }
                router.push(session.exitRoute);
            };
            // Wait 1.5s for user to see the notification, then cleanup and navigate
            const timer = setTimeout(() => void cleanupAndNavigate(), 1500);
            return () => clearTimeout(timer);
        }
    }, [callState.status, session, router, user?.uid]);

    // ── If the overlay already has this session active but hidden, expand it.
    useEffect(() => {
        if (
            state.sessionData?.requestId === requestId &&
            state.mode === "hidden"
        ) {
            expand();
        }
    }, [state.sessionData?.requestId, requestId, state.mode, expand]);

    // ── When the overlay is expanded, the room UI is handled by
    //    PersistentMeetOverlay in the root layout — nothing to render here.
    if (state.mode === "expanded") return null;

    // ── Animated loading state while TanStack cache hydrates
    if (isLoading || !session) {
        return (
            <Box
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "light-dark(#f5f5f7, #0f0f0f)",
                    animation: "meet-content-fade-in 0.3s ease-out",
                }}
            >
                <style>{`
                    @keyframes meet-content-fade-in {
                        from { opacity: 0; }
                        to   { opacity: 1; }
                    }
                    @keyframes meet-content-float {
                        0%, 100% { transform: translateY(0); }
                        50%      { transform: translateY(-6px); }
                    }
                    @keyframes meet-content-glow {
                        0%   { transform: scale(0.92); opacity: 0.3; }
                        50%  { transform: scale(1.08); opacity: 0.7; }
                        100% { transform: scale(0.92); opacity: 0.3; }
                    }
                    @keyframes meet-content-pulse {
                        0%, 100% { opacity: 0.5; }
                        50%      { opacity: 1; }
                    }
                    @keyframes meet-content-dot {
                        0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
                        40%           { transform: scale(1);   opacity: 1; }
                    }
                `}</style>
                <Center h="100vh">
                    <Stack align="center" gap="lg">
                        <Box style={{ position: "relative", animation: "meet-content-float 3s ease-in-out infinite" }}>
                            <Box
                                style={{
                                    position: "absolute",
                                    inset: -20,
                                    borderRadius: "50%",
                                    background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)",
                                    animation: "meet-content-glow 2.5s ease-in-out infinite",
                                }}
                            />
                            <Box
                                style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: "50%",
                                    background: "light-dark(rgba(99,102,241,0.1), rgba(99,102,241,0.15))",
                                    border: "2px solid light-dark(rgba(99,102,241,0.2), rgba(99,102,241,0.25))",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <Box
                                    style={{
                                        width: 24,
                                        height: 3,
                                        borderRadius: 2,
                                        background: "rgba(99,102,241,0.3)",
                                        animation: "meet-content-pulse 1.8s ease-in-out infinite",
                                    }}
                                />
                            </Box>
                        </Box>
                        <Stack align="center" gap={4}>
                            <Text c="dimmed" size="sm" fw={500}>
                                Connecting to meeting…
                            </Text>
                            <Group gap={3}>
                                {[0, 1, 2].map((i) => (
                                    <Box
                                        key={i}
                                        style={{
                                            width: 4,
                                            height: 4,
                                            borderRadius: "50%",
                                            background: "light-dark(rgba(0,0,0,0.3), rgba(255,255,255,0.4))",
                                            animation: `meet-content-dot 1.4s ease-in-out ${i * 0.16}s infinite`,
                                        }}
                                    />
                                ))}
                            </Group>
                        </Stack>
                    </Stack>
                </Center>
            </Box>
        );
    }

    // ── Pending call — show waiting lobby with camera preview ───────────
    if (!session.joinInfo) {
        return (
            <WaitingLobby
                localUser={session.localUser}
                remoteUser={session.remoteUser}
                requestId={requestId}
                queuePosition={callState.queuePosition}
                callStatus={callState.status}
                onCancel={() => {
                    cancel.mutate(
                        { requestId },
                        {
                            onSuccess: () => router.push(session.exitRoute),
                            onError: () => router.push(session.exitRoute),
                        },
                    );
                }}
                cancelling={cancel.isPending}
            />
        );
    }

    // ── Join info available — show the pre-join lobby ───────────────────
    if (!joined) {
        return (
            <PreJoinLobby
                localUser={session.localUser}
                remoteUser={session.remoteUser}
                onJoin={(result: LobbyResult) => {
                    setJoined(true);
                    startMeet(session as MeetSessionData & { joinInfo: NonNullable<MeetSessionData["joinInfo"]> }, {
                        micOn: result.micOn,
                        cameraOn: result.cameraOn,
                        audioDeviceId: result.audioDeviceId,
                        videoDeviceId: result.videoDeviceId,
                    });
                }}
            />
        );
    }

    // Overlay is about to expand — render nothing behind it.
    return null;
}
