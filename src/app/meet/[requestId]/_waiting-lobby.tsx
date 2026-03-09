"use client";
/**
 * WaitingLobby — combined waiting-room + camera-preview for pending calls.
 *
 * Shown when a patient navigates to /meet/{requestId} before the doctor has
 * accepted. Provides a live camera preview, mic/camera toggles, queue position,
 * wait timer, and a cancel button — all in a single iOS-style view so the
 * patient doesn't need a second page or tap.
 */
import {
    ActionIcon,
    Avatar,
    Badge,
    Box,
    Button,
    Group,
    Loader,
    Paper,
    Stack,
    Text,
    Tooltip,
} from "@mantine/core";
import {
    IconMicrophone,
    IconMicrophoneOff,
    IconPhoneOff,
    IconVideo,
    IconVideoOff,
} from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getInitials } from "@/lib/get-initials";
import type { MeetParticipant } from "./_keys";
import type { CallStatus } from "@/lib/meet/use-call-state";

// ── Props ─────────────────────────────────────────────────────────────────────

interface WaitingLobbyProps {
    localUser: MeetParticipant;
    remoteUser: MeetParticipant;
    requestId: string;
    queuePosition?: number;
    callStatus: CallStatus;
    onCancel: () => void;
    cancelling: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WaitingLobby({
    localUser,
    remoteUser,
    requestId,
    queuePosition,
    callStatus,
    onCancel,
    cancelling,
}: Readonly<WaitingLobbyProps>) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);
    const [loading, setLoading] = useState(true);
    const [seconds, setSeconds] = useState(0);

    // Audio level feedback
    const [audioLevel, setAudioLevel] = useState(0);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const rafRef = useRef<number>(0);

    // Wait timer
    useEffect(() => {
        const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    const isNext = queuePosition != null && queuePosition <= 1;

    // Audio analyser
    const connectAnalyser = useCallback((stream: MediaStream) => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        analyserRef.current?.disconnect();

        const ctx = audioCtxRef.current ?? new AudioContext();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            const count = Math.min(64, dataArray.length);
            for (let i = 0; i < count; i++) sum += dataArray[i];
            setAudioLevel(sum / count / 255);
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
    }, []);

    // Acquire camera + mic preview
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 1280, height: 720, facingMode: "user" },
                    audio: true,
                });
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
                connectAnalyser(stream);
            } catch {
                // Permission denied
            }
            if (!cancelled) setLoading(false);
        })();
        return () => {
            cancelled = true;
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            analyserRef.current?.disconnect();
            audioCtxRef.current?.close().catch(() => { });
            streamRef.current?.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        };
    }, [connectAnalyser]);

    // Toggle mic
    const toggleMic = useCallback(() => {
        setMicOn((prev) => {
            const next = !prev;
            streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = next; });
            return next;
        });
    }, []);

    // Toggle camera
    const toggleCamera = useCallback(() => {
        setCameraOn((prev) => {
            const next = !prev;
            streamRef.current?.getVideoTracks().forEach((t) => { t.enabled = next; });
            return next;
        });
    }, []);

    const effectiveLevel = micOn ? audioLevel : 0;

    return (
        <Box
            style={{
                position: "fixed",
                inset: 0,
                background: "light-dark(#f5f5f7, #0f0f0f)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "wl-fade-in 0.35s ease-out",
            }}
        >
            <style>{`
                @keyframes wl-fade-in {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes wl-slide-up {
                    from { opacity: 0; transform: translateY(16px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes wl-scale-in {
                    from { opacity: 0; transform: scale(0.96); }
                    to   { opacity: 1; transform: scale(1); }
                }
                @keyframes wl-breathe {
                    0%, 100% { transform: scale(1); opacity: 0.6; }
                    50%      { transform: scale(1.6); opacity: 0; }
                }
                @keyframes wl-colon-blink {
                    0%, 100% { opacity: 1; }
                    50%      { opacity: 0.3; }
                }
            `}</style>

            <Stack align="center" gap="lg" style={{ maxWidth: 480, width: "100%" }} p="md">
                {/* ── Camera preview with waiting overlay ──────────────── */}
                <Paper
                    radius="xl"
                    style={{
                        width: "100%",
                        aspectRatio: "16/9",
                        overflow: "hidden",
                        border: "2px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.08))",
                        background: "radial-gradient(ellipse at 50% 40%, light-dark(#e8e8f0, #1a1a2e), light-dark(#f0f0f4, #0f0f0f))",
                        position: "relative",
                        animation: "wl-scale-in 0.4s ease-out 0.05s both",
                    }}
                >
                    {loading && (
                        <Stack align="center" justify="center" style={{ position: "absolute", inset: 0 }}>
                            <Loader color="primary" size="md" />
                        </Stack>
                    )}

                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            transform: "scaleX(-1)",
                            display: cameraOn && !loading ? "block" : "none",
                        }}
                    />

                    {/* Camera off state */}
                    {!cameraOn && !loading && (
                        <Stack align="center" justify="center" style={{ position: "absolute", inset: 0 }}>
                            <Avatar
                                size={80}
                                radius={999}
                                color="primary"
                                src={localUser.photoUrl ?? undefined}
                                style={{
                                    border: "3px solid light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.15))",
                                    boxShadow: "0 0 40px rgba(99,102,241,0.25)",
                                }}
                            >
                                <Text size="lg" fw={700}>
                                    {getInitials(localUser.name)}
                                </Text>
                            </Avatar>
                            <Text c="dimmed" size="sm" mt={4}>Camera off</Text>
                        </Stack>
                    )}

                    {/* Mic/Camera toggles */}
                    {!loading && (
                        <Group
                            justify="center"
                            gap="sm"
                            style={{ position: "absolute", bottom: 12, left: 0, right: 0, zIndex: 2 }}
                        >
                            <Tooltip label={micOn ? "Mute" : "Unmute"} position="top">
                                <ActionIcon
                                    size={44}
                                    radius={999}
                                    variant="default"
                                    onClick={toggleMic}
                                    style={{
                                        background: micOn
                                            ? "light-dark(rgba(255,255,255,0.85), rgba(255,255,255,0.1))"
                                            : "light-dark(rgba(255,255,255,0.85), rgba(60,60,60,0.85))",
                                        backdropFilter: "blur(12px)",
                                        border: "1px solid light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.12))",
                                        color: micOn
                                            ? "light-dark(var(--mantine-color-dark-7), #fff)"
                                            : "var(--mantine-color-red-6)",
                                        position: "relative",
                                        overflow: "hidden",
                                    }}
                                >
                                    {micOn && effectiveLevel > 0.01 && (
                                        <Box
                                            style={{
                                                position: "absolute",
                                                inset: -1,
                                                borderRadius: 999,
                                                border: "2px solid var(--mantine-color-teal-5)",
                                                opacity: Math.min(effectiveLevel * 3, 1),
                                                transform: `scale(${1 + effectiveLevel * 0.15})`,
                                                transition: "opacity 0.08s ease, transform 0.08s ease",
                                                pointerEvents: "none",
                                            }}
                                        />
                                    )}
                                    {micOn ? <IconMicrophone size={20} /> : <IconMicrophoneOff size={20} />}
                                </ActionIcon>
                            </Tooltip>
                            <Tooltip label={cameraOn ? "Turn off camera" : "Turn on camera"} position="top">
                                <ActionIcon
                                    size={44}
                                    radius={999}
                                    variant="default"
                                    onClick={toggleCamera}
                                    style={{
                                        background: cameraOn
                                            ? "light-dark(rgba(255,255,255,0.85), rgba(255,255,255,0.1))"
                                            : "light-dark(rgba(255,255,255,0.85), rgba(60,60,60,0.85))",
                                        backdropFilter: "blur(12px)",
                                        border: "1px solid light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.12))",
                                        color: cameraOn
                                            ? "light-dark(var(--mantine-color-dark-7), #fff)"
                                            : "var(--mantine-color-red-6)",
                                    }}
                                >
                                    {cameraOn ? <IconVideo size={20} /> : <IconVideoOff size={20} />}
                                </ActionIcon>
                            </Tooltip>
                        </Group>
                    )}
                </Paper>

                {/* ── Waiting status card (iOS-style) ──────────────────── */}
                <Paper
                    radius={20}
                    style={{
                        width: "100%",
                        padding: "20px 24px",
                        background: "light-dark(rgba(255,255,255,0.8), rgba(30,30,30,0.6))",
                        backdropFilter: "blur(20px)",
                        WebkitBackdropFilter: "blur(20px)",
                        border: "1px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))",
                        animation: "wl-slide-up 0.4s ease-out 0.1s both",
                    }}
                >
                    <Stack align="center" gap="md">
                        {/* Breathing pulse + doctor avatar */}
                        <Group gap="md" align="center">
                            <Box pos="relative" style={{ width: 48, height: 48 }}>
                                <Box
                                    style={{
                                        position: "absolute",
                                        inset: -4,
                                        borderRadius: "50%",
                                        border: "2px solid var(--mantine-color-primary-4)",
                                        animation: "wl-breathe 2s ease-in-out infinite",
                                    }}
                                />
                                <Avatar
                                    size={48}
                                    radius={999}
                                    color="primary"
                                    src={remoteUser.photoUrl ?? undefined}
                                >
                                    <Text size="sm" fw={700}>
                                        {getInitials(remoteUser.name)}
                                    </Text>
                                </Avatar>
                            </Box>
                            <Stack gap={2}>
                                <Text fw={700} size="md">
                                    {isNext ? "You\u2019re next!" : `Waiting for ${remoteUser.name}`}
                                </Text>
                                <Text size="xs" c="dimmed">
                                    {callStatus === "pending"
                                        ? (isNext
                                            ? "The doctor will connect shortly\u2026"
                                            : `${(queuePosition ?? 1) - 1} patient${(queuePosition ?? 1) - 1 === 1 ? "" : "s"} ahead`)
                                        : "Connecting\u2026"}
                                </Text>
                            </Stack>
                        </Group>

                        {/* Timer + queue badge */}
                        <Group gap="md" justify="center">
                            {queuePosition != null && queuePosition > 1 && (
                                <Badge size="lg" radius="xl" color="primary" variant="light">
                                    #{queuePosition} in queue
                                </Badge>
                            )}
                            <Group gap={4}>
                                <Text size="sm" c="dimmed">Waiting</Text>
                                <Text
                                    size="sm"
                                    fw={700}
                                    ff="monospace"
                                    c="primary"
                                    style={{ letterSpacing: 1, minWidth: 48, textAlign: "center" }}
                                >
                                    <span>{mins}</span>
                                    <span style={{ animation: "wl-colon-blink 1s step-end infinite" }}>:</span>
                                    <span>{secs}</span>
                                </Text>
                            </Group>
                        </Group>

                        {/* Cancel button */}
                        <Button
                            variant="subtle"
                            color="red"
                            size="compact-sm"
                            radius="xl"
                            leftSection={<IconPhoneOff size={14} />}
                            onClick={onCancel}
                            loading={cancelling}
                            style={{ animation: "wl-slide-up 0.4s ease-out 0.2s both" }}
                        >
                            Cancel call
                        </Button>

                        {requestId && (
                            <Text size="xs" c="dimmed" style={{ opacity: 0.4 }}>
                                {requestId.slice(0, 8)}
                            </Text>
                        )}
                    </Stack>
                </Paper>
            </Stack>
        </Box>
    );
}
