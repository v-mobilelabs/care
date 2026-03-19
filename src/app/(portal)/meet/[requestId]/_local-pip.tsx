"use client";
/**
 * LocalPip — picture-in-picture local video preview with minimize/restore.
 */
import { ActionIcon, Avatar, Box, Paper, Text, Tooltip } from "@mantine/core";
import { IconMicrophoneOff, IconVideo, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { getInitials } from "@/lib/get-initials";
import { AudioWaveform } from "./_audio-waveform";
import type { Participant } from "./_room-types";

interface LocalPipProps {
    localUser: Participant;
    cameraOn: boolean;
    micOn: boolean;
    localVideoRef: React.RefObject<HTMLVideoElement | null>;
    localAudioLevelRef: React.RefObject<number>;
}

export function LocalPip({
    localUser,
    cameraOn,
    micOn,
    localVideoRef,
    localAudioLevelRef,
}: Readonly<LocalPipProps>) {
    const [pipMinimized, setPipMinimized] = useState(false);
    const [pipHovered, setPipHovered] = useState(false);

    return (
        <Box
            pos="absolute"
            onMouseEnter={() => setPipHovered(true)}
            onMouseLeave={() => setPipHovered(false)}
            style={{
                bottom: 90,
                left: 16,
                zIndex: 10,
                transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
                animation: "meet-room-scale-in 0.4s ease-out 0.2s both",
            }}
        >
            {/* Minimize / restore toggle */}
            <Tooltip label={pipMinimized ? "Show self view" : "Hide self view"} position="right">
                <ActionIcon
                    size={22}
                    radius={999}
                    variant="filled"
                    color="dark"
                    aria-label={pipMinimized ? "Show self view" : "Hide self view"}
                    onClick={() => setPipMinimized((v) => !v)}
                    style={{
                        position: "absolute",
                        top: pipMinimized ? -4 : 4,
                        left: pipMinimized ? -4 : 4,
                        zIndex: 12,
                        border: "1.5px solid light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.15))",
                        opacity: pipMinimized || pipHovered ? 0.85 : 0,
                        transition: "opacity 0.15s ease",
                        pointerEvents: pipMinimized || pipHovered ? "auto" : "none",
                    }}
                >
                    {pipMinimized ? <IconVideo size={12} /> : <IconX size={12} />}
                </ActionIcon>
            </Tooltip>

            {/* Minimised pill — small indicator (shown when minimized) */}
            {pipMinimized && (
                <Paper
                    radius={999}
                    onClick={() => setPipMinimized(false)}
                    style={{
                        width: 40,
                        height: 40,
                        overflow: "hidden",
                        border: "2px solid var(--mantine-color-primary-7)",
                        background: "radial-gradient(circle, light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-8)), light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9)))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                    }}
                >
                    <IconVideo size={18} color="light-dark(rgba(0,0,0,0.4), rgba(255,255,255,0.5))" />
                </Paper>
            )}

            {/* Full PIP — always mounted to preserve Chime tile binding, hidden when minimized */}
            <Box style={pipMinimized ? { position: "absolute", width: 0, height: 0, overflow: "hidden", opacity: 0, pointerEvents: "none" } : undefined}>
                <Paper
                    radius="md"
                    style={{
                        width: 200,
                        aspectRatio: "16/9",
                        overflow: "hidden",
                        border: "2px solid var(--mantine-color-primary-7)",
                        background: cameraOn ? "light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-9))" : "radial-gradient(circle, light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-8)), light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9)))",
                        position: "relative",
                    }}
                >
                    {/* Always mount the <video> so localVideoRef stays
                        available for Chime's videoTileDidUpdate binding.
                        Hiding via display:none keeps the ref intact when
                        the camera is toggled off then back on. */}
                    <video
                        ref={localVideoRef}
                        style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: cameraOn ? "block" : "none",
                        }}
                        autoPlay
                        playsInline
                        muted
                    />
                    {!cameraOn && (
                        <Box
                            style={{
                                width: "100%",
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Avatar
                                size={52}
                                radius={999}
                                color="primary"
                                src={localUser.photoUrl ?? undefined}
                                style={{ border: "2px solid light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.1))" }}
                            >
                                {getInitials(localUser.name)}
                            </Avatar>
                        </Box>
                    )}

                    {/* Local name overlay — inside PIP, bottom-left */}
                    {cameraOn && (
                        <Box
                            pos="absolute"
                            style={{
                                bottom: 5,
                                left: 6,
                                background: "rgba(0,0,0,0.55)",
                                backdropFilter: "blur(4px)",
                                borderRadius: 10,
                                padding: "2px 7px",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                            }}
                        >
                            <Text size="10px" fw={500} c="white" style={{ lineHeight: 1.4 }}>
                                {localUser.name}
                            </Text>
                            {micOn ? (
                                <AudioWaveform levelRef={localAudioLevelRef} barHeight={8} barWidth={2} gap={1.5} />
                            ) : (
                                <IconMicrophoneOff size={9} color="var(--mantine-color-red-4)" />
                            )}
                        </Box>
                    )}
                </Paper>

                {/* Name below PIP when camera is off */}
                {!cameraOn && (
                    <Text
                        size="xs"
                        c="dimmed"
                        ta="center"
                        fw={500}
                        style={{ marginTop: 6, lineHeight: 1 }}
                    >
                        {localUser.name}
                    </Text>
                )}
            </Box>
        </Box>
    );
}
