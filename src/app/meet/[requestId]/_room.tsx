"use client";
/**
 * _room.tsx — Chime SDK video meeting room.
 *
 * Dynamically imported (no SSR) to avoid `window` / Web Audio errors in Node.
 */
import {
    ConsoleLogger,
    DefaultDeviceController,
    DefaultEventController,
    DefaultMeetingSession,
    LogLevel,
    MeetingSessionConfiguration,
    NoOpEventReporter,
    type VideoTileState,
} from "amazon-chime-sdk-js";
import {
    ActionIcon,
    Alert,
    Avatar,
    Badge,
    Box,
    Group,
    Loader,
    Stack,
    Text,
    Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
    IconAlertCircle,
    IconMicrophone,
    IconMicrophoneOff,
    IconPhone,
    IconVideo,
    IconVideoOff,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AttendeeJoinInfo } from "@/data/meet";
import { useEndCall } from "@/app/chat/connect/_query";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoomProps {
    requestId: string;
    joinInfo: AttendeeJoinInfo;
}

// ── Main room component ───────────────────────────────────────────────────────

export function MeetingRoom({ requestId, joinInfo }: Readonly<RoomProps>) {
    const router = useRouter();
    const endCall = useEndCall();

    // Use refs for the session so cleanup never goes stale and re-renders don't
    // cause double-init in React StrictMode.
    const sessionRef = useRef<DefaultMeetingSession | null>(null);
    const stoppedByUsRef = useRef(false); // true when WE initiated the stop

    const [status, setStatus] = useState<"initialising" | "ready" | "error">("initialising");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);
    const [remoteTileId, setRemoteTileId] = useState<number | null>(null);

    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

    // ── Initialise Chime session ────────────────────────────────────────────

    useEffect(() => {
        // Guard against React StrictMode double-invocation: if a session is
        // already running (from the first mount) skip re-init.
        if (sessionRef.current) return;

        // Reset so the second StrictMode mount doesn't inherit a stale "true"
        // from the first mount's cleanup stop.
        stoppedByUsRef.current = false;
        let cancelled = false;

        const init = async () => {
            try {
                // Use LogLevel.ERROR to suppress the noisy
                // "session will not be reconnected" WARN that fires on cleanup.
                const logger = new ConsoleLogger("Chime", LogLevel.ERROR);
                const deviceController = new DefaultDeviceController(logger);

                const config = new MeetingSessionConfiguration(
                    {
                        MeetingId: joinInfo.meeting.MeetingId,
                        MediaRegion: joinInfo.meeting.MediaRegion,
                        MediaPlacement: joinInfo.meeting.MediaPlacement,
                        // Omit ExternalMeetingId when undefined — Chime's event
                        // reporter flattens all config attributes and throws
                        // "Unhandled type" for undefined values.
                        ...(joinInfo.meeting.ExternalMeetingId !== undefined && {
                            ExternalMeetingId: joinInfo.meeting.ExternalMeetingId,
                        }),
                    },
                    {
                        AttendeeId: joinInfo.attendee.AttendeeId,
                        ExternalUserId: joinInfo.attendee.ExternalUserId,
                        JoinToken: joinInfo.attendee.JoinToken,
                    },
                );

                // Pass a NoOpEventReporter so Chime never tries to flatten
                // nested meeting attributes (MediaPlacement, etc.) into a flat
                // key-value map — that's what causes the
                // "Unhandled type received while flattening attributes" error.
                const eventController = new DefaultEventController(
                    config,
                    logger,
                    new NoOpEventReporter(),
                );
                const sess = new DefaultMeetingSession(config, logger, deviceController, eventController);

                const observer = {
                    videoTileDidUpdate: (tileState: VideoTileState) => {
                        if (tileState.tileId === null) return;
                        if (tileState.localTile && localVideoRef.current) {
                            sess.audioVideo.bindVideoElement(
                                tileState.tileId,
                                localVideoRef.current,
                            );
                        } else if (!tileState.localTile && remoteVideoRef.current) {
                            sess.audioVideo.bindVideoElement(
                                tileState.tileId,
                                remoteVideoRef.current,
                            );
                            setRemoteTileId(tileState.tileId);
                        }
                    },
                    videoTileWasRemoved: (tileId: number) => {
                        setRemoteTileId((prev) => (prev === tileId ? null : prev));
                    },
                    audioVideoDidStop: () => {
                        // Only navigate away if the stop was triggered by the
                        // remote side (doctor/patient hung up) — not by our own
                        // cleanup or explicit End button.
                        if (stoppedByUsRef.current) return;
                        notifications.show({
                            title: "Call ended",
                            message: "The other person left the call.",
                            color: "gray",
                        });
                        router.push("/chat/connect");
                    },
                };

                sess.audioVideo.addObserver(observer);

                // Enumerate and start devices
                const [audioDevices, videoDevices] = await Promise.all([
                    sess.audioVideo.listAudioInputDevices(),
                    sess.audioVideo.listVideoInputDevices(),
                ]);

                // If we were cancelled during the async device enumeration, stop
                // before doing anything else. Mark as "us" so the observer
                // doesn't trigger a navigation away from the room.
                if (cancelled) {
                    stoppedByUsRef.current = true;
                    try { sess.audioVideo.stop(); } catch { /* ignore */ }
                    return;
                }

                if (audioDevices[0]?.deviceId) {
                    await sess.audioVideo.startAudioInput(audioDevices[0].deviceId);
                }
                if (videoDevices[0]?.deviceId) {
                    await sess.audioVideo.startVideoInput(videoDevices[0].deviceId);
                }

                if (cancelled) {
                    stoppedByUsRef.current = true;
                    try { sess.audioVideo.stop(); } catch { /* ignore */ }
                    return;
                }

                sessionRef.current = sess;
                sess.audioVideo.start();
                sess.audioVideo.startLocalVideoTile();
                setStatus("ready");
            } catch (err) {
                if (!cancelled) {
                    setErrorMessage((err as Error)?.message ?? "Failed to start video session.");
                    setStatus("error");
                }
            }
        };

        void init();

        return () => {
            cancelled = true;
            // Only stop if a session was fully initialised and stored.
            if (sessionRef.current) {
                stoppedByUsRef.current = true;
                try { sessionRef.current.audioVideo.stop(); } catch { /* ignore */ }
                sessionRef.current = null;
            }
        };
        // joinInfo is stable (object created once before this component mounts)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Mic toggle ──────────────────────────────────────────────────────────

    const toggleMic = useCallback(async () => {
        const sess = sessionRef.current;
        if (!sess) return;
        if (micOn) {
            await sess.audioVideo.realtimeMuteLocalAudio();
        } else {
            await sess.audioVideo.realtimeUnmuteLocalAudio();
        }
        setMicOn((v) => !v);
    }, [micOn]);

    // ── Camera toggle ───────────────────────────────────────────────────────

    const toggleCamera = useCallback(async () => {
        const sess = sessionRef.current;
        if (!sess) return;
        if (cameraOn) {
            sess.audioVideo.stopLocalVideoTile();
        } else {
            sess.audioVideo.startLocalVideoTile();
        }
        setCameraOn((v) => !v);
    }, [cameraOn]);

    // ── End call ────────────────────────────────────────────────────────────

    const handleEnd = () => {
        stoppedByUsRef.current = true;
        if (sessionRef.current) {
            try { sessionRef.current.audioVideo.stop(); } catch { /* ignore */ }
            sessionRef.current = null;
        }
        endCall.mutate(
            { requestId },
            {
                onSettled: () => {
                    router.push("/chat/connect");
                },
            },
        );
    };

    // ── Render ──────────────────────────────────────────────────────────────

    if (status === "error") {
        return (
            <Stack align="center" justify="center" h="100vh" p="xl">
                <Alert
                    icon={<IconAlertCircle size={16} />}
                    color="red"
                    radius="lg"
                    title="Could not start video"
                >
                    {errorMessage ?? "Unable to access camera or microphone."}
                </Alert>
            </Stack>
        );
    }

    return (
        <Box
            style={{
                position: "fixed",
                inset: 0,
                background: "#0a0a0a",
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* Video area */}
            <Box style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                {/* Remote video (full) */}
                <Box
                    style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: 0,
                        overflow: "hidden",
                        background: "#111",
                    }}
                >
                    {remoteTileId === null && (
                        <Stack
                            align="center"
                            justify="center"
                            h="100%"
                            gap="md"
                            style={{ color: "#fff" }}
                        >
                            {status === "initialising" ? (
                                <Loader color="white" />
                            ) : (
                                <>
                                    <Avatar size="xl" radius="xl" color="primary">
                                        <IconPhone size={40} />
                                    </Avatar>
                                    <Text c="dimmed" size="sm">
                                        Waiting for the other person to join…
                                    </Text>
                                </>
                            )}
                        </Stack>
                    )}
                    <video
                        ref={remoteVideoRef}
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: remoteTileId === null ? "none" : "block",
                        }}
                        autoPlay
                        playsInline
                    />
                </Box>

                {/* Local video (PIP) */}
                <Box
                    pos="absolute"
                    style={{
                        bottom: 16,
                        right: 16,
                        width: 200,
                        borderRadius: "var(--mantine-radius-lg)",
                        overflow: "hidden",
                        border: "2px solid rgba(255,255,255,0.15)",
                        aspectRatio: "16/9",
                        background: "#222",
                    }}
                >
                    {cameraOn ? (
                        <video
                            ref={localVideoRef}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            autoPlay
                            playsInline
                            muted
                        />
                    ) : (
                        <Stack align="center" justify="center" h="100%" gap="xs">
                            <Avatar size="md" radius="xl" color="primary">
                                <IconVideoOff size={20} />
                            </Avatar>
                            <Text size="xs" c="dimmed">
                                Camera off
                            </Text>
                        </Stack>
                    )}
                    <Badge
                        size="xs"
                        color="dark"
                        variant="filled"
                        pos="absolute"
                        style={{ bottom: 6, left: 6, opacity: 0.8 }}
                    >
                        You
                    </Badge>
                </Box>
            </Box>

            {/* Controls */}
            <Box
                style={{
                    background: "rgba(0,0,0,0.85)",
                    backdropFilter: "blur(12px)",
                    padding: "12px 24px",
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                }}
            >
                <Group justify="center" gap="md">
                    <Tooltip label={micOn ? "Mute" : "Unmute"} position="top">
                        <ActionIcon
                            size="xl"
                            radius="xl"
                            variant={micOn ? "subtle" : "filled"}
                            color={micOn ? "gray" : "red"}
                            onClick={() => void toggleMic()}
                            style={{ color: "#fff" }}
                        >
                            {micOn ? <IconMicrophone size={22} /> : <IconMicrophoneOff size={22} />}
                        </ActionIcon>
                    </Tooltip>

                    <Tooltip label={cameraOn ? "Turn off camera" : "Turn on camera"} position="top">
                        <ActionIcon
                            size="xl"
                            radius="xl"
                            variant={cameraOn ? "subtle" : "filled"}
                            color={cameraOn ? "gray" : "red"}
                            onClick={() => void toggleCamera()}
                            style={{ color: "#fff" }}
                        >
                            {cameraOn ? <IconVideo size={22} /> : <IconVideoOff size={22} />}
                        </ActionIcon>
                    </Tooltip>

                    <Tooltip label="End call" position="top">
                        <ActionIcon
                            size="xl"
                            radius="xl"
                            color="red"
                            variant="filled"
                            loading={endCall.isPending}
                            onClick={handleEnd}
                        >
                            <IconPhone
                                size={22}
                                style={{ transform: "rotate(135deg)" }}
                            />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Box>
        </Box>
    );
}
