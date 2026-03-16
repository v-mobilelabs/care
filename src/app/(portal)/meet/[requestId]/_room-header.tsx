"use client";
/**
 * RoomHeader — floating header "island" showing remote user info, recording
 * indicator, call timer, and ambient network quality.
 */
import { Box, Group, Loader, Text, Tooltip } from "@mantine/core";
import { IconClock, IconMicrophoneOff, IconWifi } from "@tabler/icons-react";
import { AudioWaveform } from "./_audio-waveform";
import { formatDuration, type ConnectionHealth, type NetworkStats, type Participant } from "./_room-types";

interface RoomHeaderProps {
    remoteUser: Participant;
    remoteMuted: boolean;
    status: "initialising" | "ready" | "error";
    callDuration: number;
    connectionHealth: ConnectionHealth;
    networkStats: NetworkStats | null;
    remoteAudioLevelRef: React.RefObject<number>;
}

export function RoomHeader({
    remoteUser,
    remoteMuted,
    status,
    callDuration,
    connectionHealth,
    networkStats,
    remoteAudioLevelRef,
}: Readonly<RoomHeaderProps>) {
    return (
        <Box
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                padding: "16px 16px 0",
                zIndex: 10,
                pointerEvents: "none",
                animation: "meet-room-slide-down 0.4s ease-out 0.1s both",
            }}
        >
            <Group
                gap="sm"
                style={{
                    background: "light-dark(rgba(255,255,255,0.85), rgba(30,30,30,0.85))",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    border: "1px solid light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.08))",
                    borderRadius: 999,
                    padding: "6px 18px",
                    boxShadow: "0 8px 32px light-dark(rgba(0,0,0,0.08), rgba(0,0,0,0.5)), 0 0 0 0.5px light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.06)) inset",
                    pointerEvents: "auto",
                    minHeight: 36,
                }}
            >
                {/* Remote user */}
                <Group gap={6}>
                    <Text size="xs" fw={600} style={{ lineHeight: 1 }}>
                        {remoteUser.name}
                    </Text>
                    {remoteMuted ? (
                        <IconMicrophoneOff size={12} color="var(--mantine-color-red-4)" />
                    ) : status === "ready" ? (
                        <AudioWaveform levelRef={remoteAudioLevelRef} barHeight={10} barWidth={2} gap={1.5} />
                    ) : null}
                </Group>

                {/* Separator */}
                <Box style={{ width: 1, height: 14, background: "light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.12))" }} />

                {/* Call timer */}
                {status === "ready" && (
                    <Group gap={6}>
                        <IconClock size={13} color="light-dark(rgba(0,0,0,0.4), rgba(255,255,255,0.4))" />
                        <Text
                            size="xs"
                            fw={500}
                            style={{
                                color: "light-dark(rgba(0,0,0,0.6), rgba(255,255,255,0.7))",
                                fontVariantNumeric: "tabular-nums",
                                letterSpacing: "0.02em",
                            }}
                        >
                            {formatDuration(callDuration)}
                        </Text>
                    </Group>
                )}
                {status === "initialising" && (
                    <Group gap={6}>
                        <Loader size={12} color="light-dark(rgba(0,0,0,0.3), rgba(255,255,255,0.4))" type="dots" />
                        <Text size="xs" c="dimmed">
                            Setting up…
                        </Text>
                    </Group>
                )}

                {/* Ambient network quality indicator */}
                {status === "ready" && (() => {
                    const netQuality = connectionHealth === "reconnecting"
                        ? "reconnecting"
                        : connectionHealth === "poor"
                            ? "poor"
                            : (networkStats?.quality ?? "good");
                    const qualityColor = {
                        excellent: "var(--mantine-color-teal-5)",
                        good: "var(--mantine-color-green-5)",
                        fair: "var(--mantine-color-yellow-5)",
                        poor: "var(--mantine-color-red-5)",
                        reconnecting: "var(--mantine-color-orange-5)",
                    }[netQuality] ?? "var(--mantine-color-green-5)";
                    return (
                        <>
                            <Box style={{ width: 1, height: 14, background: "light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.12))" }} />
                            <Tooltip label={netQuality === "reconnecting" ? "Reconnecting…" : `Connection: ${netQuality}`} position="bottom">
                                <Group gap={4} style={{ cursor: "default" }}>
                                    <IconWifi size={13} color={qualityColor} />
                                    {netQuality === "reconnecting" && (
                                        <Loader size={10} color="orange" />
                                    )}
                                    {(netQuality === "poor" || netQuality === "fair") && (
                                        <Text size="10px" fw={600} style={{ color: qualityColor, lineHeight: 1 }}>
                                            {netQuality === "poor" ? "Unstable" : "Fair"}
                                        </Text>
                                    )}
                                </Group>
                            </Tooltip>
                        </>
                    );
                })()}
            </Group>
        </Box>
    );
}
