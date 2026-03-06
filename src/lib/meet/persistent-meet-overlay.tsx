"use client";
/**
 * PersistentMeetOverlay — renders the MeetingRoom as a fixed overlay that
 * lives in the root layout and persists across page navigations.
 *
 * When `mode === "expanded"`, the room fills the screen (z-index 9999).
 * When `mode === "hidden"`, the room is invisible + non-interactive but stays
 * mounted, so the Chime WebRTC peer connection (and audio) remain alive.
 */
import dynamic from "next/dynamic";
import { Box, Center, Loader, Stack, Text } from "@mantine/core";
import { useMeetSession } from "./meet-session-context";

const MeetingRoom = dynamic(
    () => import("@/app/meet/[requestId]/_room").then((m) => ({ default: m.MeetingRoom })),
    {
        ssr: false,
        loading: () => (
            <Center h="100vh">
                <Stack align="center" gap="md">
                    <Loader size="lg" />
                    <Text c="dimmed" size="sm">
                        Loading video call…
                    </Text>
                </Stack>
            </Center>
        ),
    },
);

export function PersistentMeetOverlay() {
    const { state, endMeet, minimize } = useMeetSession();

    // Nothing to render when no active session
    if (!state.sessionData) return null;

    const isExpanded = state.mode === "expanded";

    return (
        <Box
            style={{
                position: "fixed",
                inset: 0,
                // Expanded: on top of everything. Hidden: behind everything.
                zIndex: isExpanded ? 9999 : -1,
                pointerEvents: isExpanded ? "auto" : "none",
                // Use visibility instead of display so the component stays
                // mounted and video elements keep their srcObject binding.
                visibility: isExpanded ? "visible" : "hidden",
            }}
        >
            <MeetingRoom
                requestId={state.sessionData.requestId}
                joinInfo={state.sessionData.joinInfo}
                localUser={state.sessionData.localUser}
                remoteUser={state.sessionData.remoteUser}
                exitRoute={state.sessionData.exitRoute}
                userKind={state.sessionData.userKind}
                localUserId={state.sessionData.localUserId}
                doctorId={state.sessionData.doctorId}
                initialMicOn={state.initialMicOn}
                initialCameraOn={state.initialCameraOn}
                initialAudioDeviceId={state.initialAudioDeviceId}
                initialVideoDeviceId={state.initialVideoDeviceId}
                onEnd={endMeet}
                onMinimize={minimize}
            />
        </Box>
    );
}
