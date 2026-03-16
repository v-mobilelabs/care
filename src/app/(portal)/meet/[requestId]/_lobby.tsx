"use client";
/**
 * _lobby.tsx — Teams-style pre-join screen.
 *
 * Shows a live camera preview, mic/camera toggles with real-time audio level
 * feedback, device selectors for mic & camera, and a "Join now" button.
 * Only shown for patients; doctors skip straight into the room.
 */
import {
    ActionIcon,
    Avatar,
    Box,
    Button,
    Group,
    Loader,
    Paper,
    Select,
    Stack,
    Text,
    Tooltip,
} from "@mantine/core";
import {
    IconChevronDown,
    IconMicrophone,
    IconMicrophoneOff,
    IconPhone,
    IconVideo,
    IconVideoOff,
} from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getInitials } from "@/lib/get-initials";

export interface LobbyResult {
    micOn: boolean;
    cameraOn: boolean;
    audioDeviceId: string | null;
    videoDeviceId: string | null;
}

interface LobbyProps {
    localUser: { name: string; photoUrl: string | null };
    remoteUser: { name: string; photoUrl: string | null };
    onJoin: (result: LobbyResult) => void;
}

export function PreJoinLobby({
    localUser,
    remoteUser,
    onJoin,
}: Readonly<LobbyProps>) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(true);
    const [loading, setLoading] = useState(true);

    // Audio level feedback (0–1)
    const [audioLevel, setAudioLevel] = useState(0);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const rafRef = useRef<number>(0);

    // Device lists & selection
    const [audioInputs, setAudioInputs] = useState<{ value: string; label: string }[]>([]);
    const [videoInputs, setVideoInputs] = useState<{ value: string; label: string }[]>([]);
    const [selectedAudioInput, setSelectedAudioInput] = useState<string | null>(null);
    const [selectedVideoInput, setSelectedVideoInput] = useState<string | null>(null);

    // Helper: connect an audio analyser to the current stream
    const connectAnalyser = useCallback((stream: MediaStream) => {
        // Clean up previous analyser
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
            // Average the low-to-mid frequency bins (voice range)
            let sum = 0;
            const count = Math.min(64, dataArray.length);
            for (let i = 0; i < count; i++) sum += dataArray[i];
            const avg = sum / count / 255; // normalise to 0–1
            setAudioLevel(avg);
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
    }, []);

    // Acquire camera + mic preview stream and enumerate devices
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
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }

                // Start audio level analyser
                connectAnalyser(stream);

                // Enumerate devices after permission is granted (labels are available)
                const devices = await navigator.mediaDevices.enumerateDevices();
                const mics = devices
                    .filter((d) => d.kind === "audioinput" && d.deviceId)
                    .map((d, i) => ({ value: d.deviceId, label: d.label || `Microphone ${i + 1}` }));
                const cameras = devices
                    .filter((d) => d.kind === "videoinput" && d.deviceId)
                    .map((d, i) => ({ value: d.deviceId, label: d.label || `Camera ${i + 1}` }));

                if (!cancelled) {
                    setAudioInputs(mics);
                    setVideoInputs(cameras);
                    // Pre-select the device currently in use
                    const activeAudio = stream.getAudioTracks()[0]?.getSettings().deviceId;
                    const activeVideo = stream.getVideoTracks()[0]?.getSettings().deviceId;
                    setSelectedAudioInput(activeAudio ?? mics[0]?.value ?? null);
                    setSelectedVideoInput(activeVideo ?? cameras[0]?.value ?? null);
                }
            } catch {
                // Permission denied or no devices — user can still join with defaults
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

    // Switch audio device
    const switchAudioDevice = useCallback(async (deviceId: string) => {
        setSelectedAudioInput(deviceId);
        const stream = streamRef.current;
        if (!stream) return;
        // Stop old audio tracks
        stream.getAudioTracks().forEach((t) => t.stop());
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                audio: { deviceId: { exact: deviceId } },
            });
            const newTrack = newStream.getAudioTracks()[0];
            if (newTrack) {
                stream.getAudioTracks().forEach((t) => stream.removeTrack(t));
                stream.addTrack(newTrack);
                newTrack.enabled = micOn;
                // Reconnect analyser for the new mic
                connectAnalyser(stream);
            }
        } catch {
            // Fallback — couldn't switch
        }
    }, [micOn, connectAnalyser]);

    // Switch video device
    const switchVideoDevice = useCallback(async (deviceId: string) => {
        setSelectedVideoInput(deviceId);
        const stream = streamRef.current;
        if (!stream) return;
        // Stop old video tracks
        stream.getVideoTracks().forEach((t) => t.stop());
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: deviceId }, width: 1280, height: 720 },
            });
            const newTrack = newStream.getVideoTracks()[0];
            if (newTrack) {
                stream.getVideoTracks().forEach((t) => stream.removeTrack(t));
                stream.addTrack(newTrack);
                newTrack.enabled = cameraOn;
                // Re-assign to video element
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }
        } catch {
            // Fallback — couldn't switch
        }
    }, [cameraOn]);

    // Toggle mic track
    const toggleMic = useCallback(() => {
        setMicOn((prev) => {
            const next = !prev;
            streamRef.current?.getAudioTracks().forEach((t) => {
                t.enabled = next;
            });
            return next;
        });
    }, []);

    // Toggle camera track
    const toggleCamera = useCallback(() => {
        setCameraOn((prev) => {
            const next = !prev;
            streamRef.current?.getVideoTracks().forEach((t) => {
                t.enabled = next;
            });
            return next;
        });
    }, []);

    const handleJoin = () => {
        // Stop the preview stream & audio analyser — the room will acquire its own
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        analyserRef.current?.disconnect();
        audioCtxRef.current?.close().catch(() => { });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        onJoin({ micOn, cameraOn, audioDeviceId: selectedAudioInput, videoDeviceId: selectedVideoInput });
    };

    // Effective level — zero when muted
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
                animation: "lobby-fade-in 0.35s ease-out",
            }}
        >
            {/* Lobby entrance animations */}
            <style>{`
                @keyframes lobby-fade-in {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes lobby-slide-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes lobby-scale-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to   { opacity: 1; transform: scale(1); }
                }
                @keyframes lobby-btn-pop {
                    from { opacity: 0; transform: scale(0.85); }
                    to   { opacity: 1; transform: scale(1); }
                }
            `}</style>
            <Stack align="center" gap="lg" style={{ maxWidth: 520, width: "100%" }} p="md">
                {/* Video preview */}
                <Paper
                    radius="lg"
                    style={{
                        width: "100%",
                        aspectRatio: "16/9",
                        overflow: "hidden",
                        border: "2px solid light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.1))",
                        background: "radial-gradient(ellipse at 50% 40%, light-dark(#e8e8f0, #1a1a2e) 0%, light-dark(#f0f0f4, #0f0f0f) 70%)",
                        position: "relative",
                        animation: "lobby-scale-in 0.4s ease-out 0.05s both",
                    }}
                >
                    {loading && (
                        <Stack
                            align="center"
                            justify="center"
                            style={{ position: "absolute", inset: 0 }}
                        >
                            <Loader color="primary" size="md" />
                        </Stack>
                    )}

                    {/* Live preview video — always mounted so ref persists */}
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

                    {/* Camera-off state */}
                    {!cameraOn && !loading && (
                        <Stack
                            align="center"
                            justify="center"
                            style={{ position: "absolute", inset: 0 }}
                        >
                            <Avatar
                                size={96}
                                radius={999}
                                color="primary"
                                src={localUser.photoUrl ?? undefined}
                                style={{
                                    border: "3px solid light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.15))",
                                    boxShadow: "0 0 40px rgba(99,102,241,0.25)",
                                }}
                            >
                                <Text size="xl" fw={700}>
                                    {getInitials(localUser.name)}
                                </Text>
                            </Avatar>
                            <Text c="dimmed" size="sm" mt="xs">
                                Camera is off
                            </Text>
                        </Stack>
                    )}

                    {/* Mic/Camera toggle overlay — bottom centre of preview */}
                    {!loading && (
                        <Group
                            justify="center"
                            gap="sm"
                            style={{
                                position: "absolute",
                                bottom: 12,
                                left: 0,
                                right: 0,
                                zIndex: 2,
                            }}
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
                                    {/* Audio level ring feedback */}
                                    {micOn && effectiveLevel > 0.01 && (
                                        <Box
                                            style={{
                                                position: "absolute",
                                                inset: -1,
                                                borderRadius: 999,
                                                border: `2px solid var(--mantine-color-teal-5)`,
                                                opacity: Math.min(effectiveLevel * 3, 1),
                                                transform: `scale(${1 + effectiveLevel * 0.15})`,
                                                transition: "opacity 0.08s ease, transform 0.08s ease",
                                                pointerEvents: "none",
                                            }}
                                        />
                                    )}
                                    <AnimatePresence mode="wait" initial={false}>
                                        <motion.div
                                            key={micOn ? "mic-on" : "mic-off"}
                                            initial={{ rotate: -45, opacity: 0, scale: 0.5 }}
                                            animate={{ rotate: 0, opacity: 1, scale: 1 }}
                                            exit={{ rotate: 45, opacity: 0, scale: 0.5 }}
                                            transition={{ duration: 0.2, ease: "easeInOut" }}
                                            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                                        >
                                            {micOn ? <IconMicrophone size={20} /> : <IconMicrophoneOff size={20} />}
                                        </motion.div>
                                    </AnimatePresence>
                                </ActionIcon>
                            </Tooltip>
                            <Tooltip
                                label={cameraOn ? "Turn off camera" : "Turn on camera"}
                                position="top"
                            >
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
                                    <AnimatePresence mode="wait" initial={false}>
                                        <motion.div
                                            key={cameraOn ? "cam-on" : "cam-off"}
                                            initial={{ rotate: -45, opacity: 0, scale: 0.5 }}
                                            animate={{ rotate: 0, opacity: 1, scale: 1 }}
                                            exit={{ rotate: 45, opacity: 0, scale: 0.5 }}
                                            transition={{ duration: 0.2, ease: "easeInOut" }}
                                            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                                        >
                                            {cameraOn ? <IconVideo size={20} /> : <IconVideoOff size={20} />}
                                        </motion.div>
                                    </AnimatePresence>
                                </ActionIcon>
                            </Tooltip>
                        </Group>
                    )}
                </Paper>

                {/* Mic level meter bar (Teams-style) */}
                {!loading && micOn && (
                    <Box style={{ width: "100%", maxWidth: 280 }}>
                        <Group gap={6} mb={4} justify="center">
                            <IconMicrophone size={12} style={{ color: "light-dark(rgba(0,0,0,0.4), rgba(255,255,255,0.5))" }} />
                            <Text size="xs" c="dimmed">Mic test</Text>
                        </Group>
                        <Box
                            style={{
                                width: "100%",
                                height: 4,
                                borderRadius: 2,
                                background: "light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.08))",
                                overflow: "hidden",
                            }}
                        >
                            <Box
                                style={{
                                    height: "100%",
                                    borderRadius: 2,
                                    width: `${Math.min(effectiveLevel * 200, 100)}%`,
                                    background: effectiveLevel > 0.5
                                        ? "var(--mantine-color-yellow-5)"
                                        : "var(--mantine-color-teal-5)",
                                    transition: "width 0.08s ease, background 0.2s ease",
                                }}
                            />
                        </Box>
                    </Box>
                )}

                {/* Device selectors — always visible Teams-style */}
                {!loading && (audioInputs.length > 0 || videoInputs.length > 0) && (
                    <Paper
                        radius="lg"
                        style={{
                            width: "100%",
                            background: "light-dark(rgba(255,255,255,0.7), rgba(255,255,255,0.04))",
                            border: "1px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))",
                            padding: "14px 16px",
                            animation: "lobby-slide-up 0.4s ease-out 0.15s both",
                        }}
                    >
                        <Stack gap="sm">
                            {audioInputs.length > 0 && (
                                <Box>
                                    <Group gap={6} mb={4}>
                                        <IconMicrophone size={13} style={{ color: "light-dark(rgba(0,0,0,0.4), rgba(255,255,255,0.5))" }} />
                                        <Text size="xs" c="dimmed">Microphone</Text>
                                    </Group>
                                    <Select
                                        size="xs"
                                        data={audioInputs}
                                        value={selectedAudioInput}
                                        onChange={(val) => { if (val) void switchAudioDevice(val); }}
                                        allowDeselect={false}
                                        rightSection={<IconChevronDown size={14} />}
                                        styles={{
                                            input: {
                                                background: "light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.06))",
                                                border: "1px solid light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.08))",
                                                fontSize: 12,
                                            },
                                            dropdown: {
                                                background: "light-dark(rgba(255,255,255,0.98), rgba(30,30,34,0.98))",
                                                border: "1px solid light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.08))",
                                            },
                                            option: { fontSize: 12 },
                                        }}
                                    />
                                </Box>
                            )}
                            {videoInputs.length > 0 && (
                                <Box>
                                    <Group gap={6} mb={4}>
                                        <IconVideo size={13} style={{ color: "light-dark(rgba(0,0,0,0.4), rgba(255,255,255,0.5))" }} />
                                        <Text size="xs" c="dimmed">Camera</Text>
                                    </Group>
                                    <Select
                                        size="xs"
                                        data={videoInputs}
                                        value={selectedVideoInput}
                                        onChange={(val) => { if (val) void switchVideoDevice(val); }}
                                        allowDeselect={false}
                                        rightSection={<IconChevronDown size={14} />}
                                        styles={{
                                            input: {
                                                background: "light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.06))",
                                                border: "1px solid light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.08))",
                                                fontSize: 12,
                                            },
                                            dropdown: {
                                                background: "light-dark(rgba(255,255,255,0.98), rgba(30,30,34,0.98))",
                                                border: "1px solid light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.08))",
                                            },
                                            option: { fontSize: 12 },
                                        }}
                                    />
                                </Box>
                            )}
                        </Stack>
                    </Paper>
                )}

                {/* Call info */}
                <Stack align="center" gap={6} style={{ animation: "lobby-slide-up 0.4s ease-out 0.2s both" }}>
                    <Text fw={600} size="lg">
                        Ready to join?
                    </Text>
                    <Group gap="xs">
                        <Avatar
                            size={24}
                            radius={999}
                            color="primary"
                            src={remoteUser.photoUrl ?? undefined}
                        >
                            <Text size="10px" fw={600}>
                                {getInitials(remoteUser.name)}
                            </Text>
                        </Avatar>
                        <Text c="dimmed" size="sm">
                            You will be connecting to {remoteUser.name}
                        </Text>
                    </Group>
                </Stack>

                {/* Join button */}
                <Button
                    size="md"
                    radius="xl"
                    variant="filled"
                    color="primary"
                    leftSection={<IconPhone size={18} />}
                    onClick={handleJoin}
                    disabled={loading}
                    style={{
                        minWidth: 160,
                        boxShadow:
                            "0 2px 8px light-dark(rgba(0,0,0,0.1), rgba(0,0,0,0.3)), 0 0 0 1px rgba(99,102,241,0.25)",
                        animation: "lobby-btn-pop 0.35s ease-out 0.3s both",
                        transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    }}
                    onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.currentTarget.style.transform = "scale(1.04)";
                    }}
                    onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.currentTarget.style.transform = "scale(1)";
                    }}
                >
                    Join now
                </Button>
            </Stack>
        </Box>
    );
}
