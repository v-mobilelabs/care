"use client";
/**
 * MeetContent — bridge between the SSR page and the PersistentMeetOverlay.
 *
 * This component does NOT render the room itself. Instead it:
 *  1. Reads session data from TanStack Query cache (hydrated by the SSR page).
 *  2. Shows the Teams-style pre-join lobby for ALL users (patient & doctor).
 *  3. Signals the global MeetSessionProvider to start/expand the overlay
 *     once the user clicks "Join now".
 *
 * The actual MeetingRoom is rendered by PersistentMeetOverlay in the root
 * layout, so it survives route navigations and keeps the call alive.
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Center, Loader, Stack, Text } from "@mantine/core";
import { PreJoinLobby, type LobbyResult } from "./_lobby";
import { meetSessionKey, type MeetSessionData } from "./_keys";
import { useMeetSession } from "@/lib/meet/meet-session-context";

export function MeetContent({
    requestId,
}: Readonly<{ requestId: string }>) {
    const { state, startMeet, expand } = useMeetSession();

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

    // ── If the overlay already has this session active but hidden, expand it.
    //    This handles the case where the user navigated away and came back
    //    (without a full reload), so the Chime session is still alive.
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

    // ── Loading state while TanStack cache hydrates
    if (isLoading || !session) {
        return (
            <Center h="100vh">
                <Stack align="center" gap="md">
                    <Loader size="lg" />
                    <Text c="dimmed" size="sm">
                        Connecting to meeting…
                    </Text>
                </Stack>
            </Center>
        );
    }

    // ── All users see the pre-join lobby (Teams-style) so they can
    //    configure mic/camera before joining — including on page reload.
    if (!joined) {
        return (
            <PreJoinLobby
                localUser={session.localUser}
                remoteUser={session.remoteUser}
                onJoin={(result: LobbyResult) => {
                    setJoined(true);
                    startMeet(session, {
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
