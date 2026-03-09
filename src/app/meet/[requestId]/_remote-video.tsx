"use client";
/**
 * RemoteVideo — full-screen remote video with camera-off avatar fallback.
 * When the remote participant is sharing their screen, the content share
 * video takes priority (full area) and the regular camera feed moves to
 * a small corner tile.
 */
import { Avatar, Box, Loader, Stack, Text } from "@mantine/core";
import { IconMicrophoneOff, IconScreenShare } from "@tabler/icons-react";
import { getInitials } from "@/lib/get-initials";
import type { Participant } from "./_room-types";

interface RemoteVideoProps {
    remoteTileId: number | null;
    remoteUser: Participant;
    remoteMuted: boolean;
    status: "initialising" | "ready" | "error";
    remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
    remoteAudioRef: React.RefObject<HTMLAudioElement | null>;
    /** Tile ID of the remote content share (screen share). null when not sharing. */
    remoteScreenShareTileId: number | null;
    /** Video element ref bound by Chime to the remote content share tile. */
    contentShareVideoRef: React.RefObject<HTMLVideoElement | null>;
}

export function RemoteVideo({
    remoteTileId,
    remoteUser,
    remoteMuted,
    status,
    remoteVideoRef,
    remoteAudioRef,
    remoteScreenShareTileId,
    contentShareVideoRef,
}: Readonly<RemoteVideoProps>) {
    const isScreenSharing = remoteScreenShareTileId !== null;

    return (
        <Box
            style={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
                background: remoteTileId === null && !isScreenSharing
                    ? "radial-gradient(ellipse at 50% 40%, light-dark(#e8e8f0, #1a1a2e) 0%, light-dark(#f0f0f4, #0f0f0f) 70%)"
                    : "light-dark(#e8e8ee, #111)",
            }}
        >
            {/* Camera-off / waiting state — only when no screen share is active */}
            {remoteTileId === null && !isScreenSharing && (
                <Stack
                    align="center"
                    justify="center"
                    h="100%"
                    gap="lg"
                    style={{ animation: "meet-room-fade-in 0.5s ease-out" }}
                >
                    {status === "initialising" ? (
                        <Stack align="center" gap="md" style={{ animation: "meet-room-float 3s ease-in-out infinite" }}>
                            <Box style={{ position: "relative" }}>
                                <Box
                                    style={{
                                        position: "absolute",
                                        inset: -16,
                                        borderRadius: "50%",
                                        background: "radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)",
                                        animation: "meet-room-glow 2.5s ease-in-out infinite",
                                    }}
                                />
                                <Loader color="primary" size="lg" />
                            </Box>
                            <Text c="dimmed" size="sm">
                                Connecting…
                            </Text>
                        </Stack>
                    ) : (
                        <>
                            {/* Glowing avatar */}
                            <Box style={{ position: "relative" }}>
                                {/* Soft glow ring */}
                                <Box
                                    style={{
                                        position: "absolute",
                                        inset: -8,
                                        borderRadius: "50%",
                                        background: "radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)",
                                    }}
                                />
                                <Avatar
                                    size={120}
                                    radius={999}
                                    color="primary"
                                    src={remoteUser.photoUrl ?? undefined}
                                    style={{
                                        border: "3px solid light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.15))",
                                        boxShadow: "0 0 40px rgba(99,102,241,0.25)",
                                    }}
                                >
                                    <Text size="xl" fw={700}>
                                        {getInitials(remoteUser.name)}
                                    </Text>
                                </Avatar>
                                {/* Muted badge on avatar */}
                                {remoteMuted && (
                                    <Box
                                        style={{
                                            position: "absolute",
                                            bottom: 4,
                                            right: 4,
                                            width: 28,
                                            height: 28,
                                            borderRadius: "50%",
                                            background: "rgba(239,68,68,0.9)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            border: "2px solid light-dark(var(--mantine-color-body), #0f0f0f)",
                                        }}
                                    >
                                        <IconMicrophoneOff size={14} color="#fff" />
                                    </Box>
                                )}
                            </Box>
                            <Stack align="center" gap={6}>
                                <Text fw={600} size="lg">
                                    {remoteUser.name}
                                </Text>
                                <Text c="dimmed" size="sm">
                                    Camera is off
                                </Text>
                            </Stack>
                        </>
                    )}
                </Stack>
            )}

            {/* Hidden audio element — Chime routes remote audio through this */}
            <audio ref={remoteAudioRef} autoPlay style={{ display: "none" }} />

            {/* Content share video (screen share).
               Always mounted & positioned so the browser's media decoder stays
               active when Chime binds the srcObject. We toggle visibility via
               opacity + z-index instead of display:none which would freeze the
               decoder / break autoPlay on Safari. */}
            <video
                ref={contentShareVideoRef}
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    background: "#000",
                    zIndex: isScreenSharing ? 1 : -1,
                    opacity: isScreenSharing ? 1 : 0,
                    pointerEvents: isScreenSharing ? "auto" : "none",
                    transition: "opacity 0.2s ease",
                }}
                autoPlay
                playsInline
            />

            {/* Screen share label overlay */}
            {isScreenSharing && (
                <Box
                    style={{
                        position: "absolute",
                        top: 12,
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "rgba(0,0,0,0.65)",
                        backdropFilter: "blur(8px)",
                        borderRadius: 999,
                        padding: "6px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        zIndex: 2,
                        animation: "meet-room-fade-in 0.3s ease-out",
                    }}
                >
                    <IconScreenShare size={14} color="#fff" />
                    <Text size="xs" c="#fff" fw={500}>
                        {remoteUser.name} is sharing their screen
                    </Text>
                </Box>
            )}

            {/* Active remote camera video */}
            {/* When screen share is active, shrink to a small corner thumbnail */}
            <video
                ref={remoteVideoRef}
                style={isScreenSharing && remoteTileId !== null ? {
                    position: "absolute",
                    bottom: 16,
                    right: 16,
                    width: 180,
                    height: 120,
                    objectFit: "cover",
                    borderRadius: 12,
                    border: "2px solid light-dark(rgba(0,0,0,0.15), rgba(255,255,255,0.15))",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
                    zIndex: 3,
                } : {
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: remoteTileId === null ? "none" : "block",
                }}
                autoPlay
                playsInline
            />
        </Box>
    );
}
