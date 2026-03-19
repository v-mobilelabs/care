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
import { Box, Center, Group, Stack, Text } from "@mantine/core";
import { useMeetSession } from "./meet-session-context";

const MeetingRoom = dynamic(
    () => import("@/app/(portal)/meet/[requestId]/_room").then((m) => ({ default: m.MeetingRoom })),
    {
        ssr: false,
        loading: () => (
            <Box
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))",
                    animation: "overlay-fade-in 0.3s ease-out",
                }}
            >
                <style>{`
                    @keyframes overlay-fade-in {
                        from { opacity: 0; }
                        to   { opacity: 1; }
                    }
                    @keyframes overlay-float {
                        0%, 100% { transform: translateY(0); }
                        50%      { transform: translateY(-6px); }
                    }
                    @keyframes overlay-glow {
                        0%   { transform: scale(0.92); opacity: 0.3; }
                        50%  { transform: scale(1.08); opacity: 0.7; }
                        100% { transform: scale(0.92); opacity: 0.3; }
                    }
                    @keyframes overlay-dot {
                        0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
                        40%           { transform: scale(1);   opacity: 1; }
                    }
                `}</style>
                <Center h="100vh">
                    <Stack align="center" gap="lg">
                        <Box style={{ position: "relative", animation: "overlay-float 3s ease-in-out infinite" }}>
                            <Box
                                style={{
                                    position: "absolute",
                                    inset: -16,
                                    borderRadius: "50%",
                                    background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)",
                                    animation: "overlay-glow 2.5s ease-in-out infinite",
                                }}
                            />
                            <Box
                                style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: "50%",
                                    background: "light-dark(rgba(99,102,241,0.1), rgba(99,102,241,0.15))",
                                    border: "2px solid light-dark(rgba(99,102,241,0.2), rgba(99,102,241,0.25))",
                                }}
                            />
                        </Box>
                        <Stack align="center" gap={4}>
                            <Text c="dimmed" size="sm" fw={500}>
                                Loading video call…
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
                                            animation: `overlay-dot 1.4s ease-in-out ${i * 0.16}s infinite`,
                                        }}
                                    />
                                ))}
                            </Group>
                        </Stack>
                    </Stack>
                </Center>
            </Box>
        ),
    },
);

export function PersistentMeetOverlay() {
    const { state, endMeet, minimize } = useMeetSession();

    // Nothing to render when no active session or join info not yet available
    if (!state.sessionData || !state.sessionData.joinInfo) return null;

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
                // Smooth expand/hide transition
                opacity: isExpanded ? 1 : 0,
                transition: "opacity 0.2s ease-out, visibility 0.2s ease-out",
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
                conversationId={state.sessionData.conversationId}
                patientId={state.sessionData.patientId}
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
