"use client";
/**
 * ControlBar — bottom floating controls (mic/camera/chat/settings/end) + Settings modal.
 */
import {
    ActionIcon,
    Box,
    Divider,
    Group,
    Indicator,
    Loader,
    Modal,
    Paper,
    Progress,
    Select,
    Stack,
    Switch,
    Text,
    Tooltip,
} from "@mantine/core";
import {
    IconArrowDown,
    IconArrowUp,
    IconCameraFilled,
    IconHome,
    IconMessage2,
    IconMicrophone,
    IconMicrophoneOff,
    IconPhone,
    IconScreenShare,
    IconScreenShareOff,
    IconSettings,
    IconVideo,
    IconVideoOff,
    IconWaveSine,
    IconWifi,
} from "@tabler/icons-react";
import { useState } from "react";
import type { NetworkStats } from "./_room-types";

interface ControlBarProps {
    micOn: boolean;
    cameraOn: boolean;
    chatOpen: boolean;
    screenShareOn: boolean;
    noiseCancellationOn: boolean;
    backgroundBlurOn: boolean;
    unreadCount: number;
    userKind: "patient" | "doctor";
    networkStats: NetworkStats | null;
    audioInputs: { value: string; label: string }[];
    videoInputs: { value: string; label: string }[];
    selectedAudioInput: string | null;
    selectedVideoInput: string | null;
    onToggleMic: () => void;
    onToggleCamera: () => void;
    onToggleChat: () => void;
    onToggleScreenShare: () => void;
    onToggleNoiseCancellation: () => void;
    onToggleBackgroundBlur: () => void;
    onSwitchAudioInput: (deviceId: string) => void;
    onSwitchVideoInput: (deviceId: string) => void;
    onEnd: () => void;
    onMinimize?: () => void;
    onNavigateDashboard: () => void;
}

export function ControlBar({
    micOn,
    cameraOn,
    chatOpen,
    screenShareOn,
    noiseCancellationOn,
    backgroundBlurOn,
    unreadCount,
    userKind,
    networkStats,
    audioInputs,
    videoInputs,
    selectedAudioInput,
    selectedVideoInput,
    onToggleMic,
    onToggleCamera,
    onToggleChat,
    onToggleScreenShare,
    onToggleNoiseCancellation,
    onToggleBackgroundBlur,
    onSwitchAudioInput,
    onSwitchVideoInput,
    onEnd,
    onMinimize,
    onNavigateDashboard,
}: Readonly<ControlBarProps>) {
    const [settingsOpen, setSettingsOpen] = useState(false);

    return (
        <Box
            style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                padding: "12px 16px 24px",
                zIndex: 10,
                pointerEvents: "none",
                animation: "meet-room-slide-up 0.4s ease-out 0.15s both",
            }}
        >
            <Group
                justify="center"
                gap={8}
                style={{
                    background: "light-dark(rgba(255,255,255,0.85), rgba(30,30,30,0.85))",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    border: "1px solid light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.08))",
                    borderRadius: 999,
                    padding: "6px 10px",
                    boxShadow: "0 8px 32px light-dark(rgba(0,0,0,0.08), rgba(0,0,0,0.5)), 0 0 0 0.5px light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.06)) inset",
                    pointerEvents: "auto",
                }}
            >
                {/* Mic */}
                <Tooltip label={micOn ? "Mute" : "Unmute"} position="top">
                    <ActionIcon
                        size={40}
                        radius={999}
                        variant="subtle"
                        color="gray"
                        aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
                        onClick={onToggleMic}
                        style={{
                            background: "light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.08))",
                            color: micOn
                                ? "light-dark(var(--mantine-color-text), var(--mantine-color-white))"
                                : "var(--mantine-color-red-6)",
                            transition: "background 0.15s ease, color 0.15s ease",
                        }}
                    >
                        {micOn ? <IconMicrophone size={20} /> : <IconMicrophoneOff size={20} />}
                    </ActionIcon>
                </Tooltip>

                {/* Camera */}
                <Tooltip label={cameraOn ? "Turn off camera" : "Turn on camera"} position="top">
                    <ActionIcon
                        size={40}
                        radius={999}
                        variant="subtle"
                        color="gray"
                        aria-label={cameraOn ? "Turn off camera" : "Turn on camera"}
                        onClick={onToggleCamera}
                        style={{
                            background: "light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.08))",
                            color: cameraOn
                                ? "light-dark(var(--mantine-color-text), var(--mantine-color-white))"
                                : "var(--mantine-color-red-6)",
                            transition: "background 0.15s ease, color 0.15s ease",
                        }}
                    >
                        {cameraOn ? <IconVideo size={20} /> : <IconVideoOff size={20} />}
                    </ActionIcon>
                </Tooltip>

                {/* Screen share */}
                <Tooltip label={screenShareOn ? "Stop sharing" : "Share screen"} position="top">
                    <ActionIcon
                        size={40}
                        radius={999}
                        variant={screenShareOn ? "light" : "subtle"}
                        color={screenShareOn ? "primary" : "gray"}
                        aria-label={screenShareOn ? "Stop sharing screen" : "Share screen"}
                        onClick={onToggleScreenShare}
                        style={{
                            background: screenShareOn ? undefined : "light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.08))",
                            color: screenShareOn
                                ? "var(--mantine-color-primary-4)"
                                : "light-dark(var(--mantine-color-text), var(--mantine-color-white))",
                            transition: "background 0.15s ease, color 0.15s ease",
                        }}
                    >
                        {screenShareOn ? <IconScreenShareOff size={20} /> : <IconScreenShare size={20} />}
                    </ActionIcon>
                </Tooltip>

                {/* Chat */}
                <Tooltip label="Chat" position="top">
                    <Indicator
                        label={unreadCount > 0 ? unreadCount : undefined}
                        size={16}
                        color="red"
                        disabled={unreadCount === 0}
                        offset={4}
                    >
                        <ActionIcon
                            size={40}
                            radius={999}
                            variant={chatOpen ? "light" : "subtle"}
                            color={chatOpen ? "primary" : "gray"}
                            aria-label={chatOpen ? "Close chat" : "Open chat"}
                            onClick={onToggleChat}
                            style={{
                                background: chatOpen ? undefined : "light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.08))",
                                color: "light-dark(var(--mantine-color-text), var(--mantine-color-white))",
                                transition: "background 0.15s ease",
                            }}
                        >
                            <IconMessage2 size={20} />
                        </ActionIcon>
                    </Indicator>
                </Tooltip>

                {/* Settings button */}
                <Tooltip label="Settings" position="top">
                    <ActionIcon
                        size={40}
                        radius={999}
                        variant={settingsOpen ? "light" : "subtle"}
                        color={settingsOpen ? "primary" : "gray"}
                        aria-label="Settings"
                        onClick={() => setSettingsOpen((v) => !v)}
                        style={{
                            background: settingsOpen ? undefined : "light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.08))",
                            color: "light-dark(var(--mantine-color-text), var(--mantine-color-white))",
                            transition: "background 0.15s ease",
                        }}
                    >
                        <IconSettings size={20} />
                    </ActionIcon>
                </Tooltip>

                {/* Settings modal */}
                <Modal
                    opened={settingsOpen}
                    onClose={() => setSettingsOpen(false)}
                    title="Settings"
                    radius="lg"
                    size="sm"
                    centered
                    zIndex={10000}
                    overlayProps={{ backgroundOpacity: 0.35, blur: 4 }}
                    styles={{
                        header: {
                            background: "var(--mantine-color-body)",
                            borderBottom: "1px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))",
                        },
                        title: { fontWeight: 700, fontSize: 14 },
                        body: { padding: 0, background: "var(--mantine-color-body)" },
                        content: { background: "var(--mantine-color-body)" },
                    }}
                >
                    {/* ── Devices ── */}
                    <Box style={{ padding: "12px 16px" }}>
                        <Text size="10px" fw={700} c="dimmed" style={{ textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                            Devices
                        </Text>

                        <Stack gap="xs">
                            <Box>
                                <Group gap={6} mb={4}>
                                    <IconMicrophone size={13} color="light-dark(rgba(0,0,0,0.4), rgba(255,255,255,0.5))" />
                                    <Text size="xs" c="dimmed">Microphone</Text>
                                </Group>
                                <Select
                                    size="xs"
                                    data={audioInputs}
                                    value={selectedAudioInput}
                                    onChange={(val) => { if (val) onSwitchAudioInput(val); }}
                                    allowDeselect={false}
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

                            <Box>
                                <Group gap={6} mb={4}>
                                    <IconVideo size={13} color="light-dark(rgba(0,0,0,0.4), rgba(255,255,255,0.5))" />
                                    <Text size="xs" c="dimmed">Camera</Text>
                                </Group>
                                <Select
                                    size="xs"
                                    data={videoInputs}
                                    value={selectedVideoInput}
                                    onChange={(val) => { if (val) onSwitchVideoInput(val); }}
                                    allowDeselect={false}
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
                        </Stack>
                    </Box>

                    <Divider color="light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))" />

                    {/* ── Features ── */}
                    <Box style={{ padding: "12px 16px" }}>
                        <Text size="10px" fw={700} c="dimmed" style={{ textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                            Features
                        </Text>
                        <Stack gap={8}>
                            <Group justify="space-between">
                                <Group gap={8}>
                                    <IconWaveSine size={14} color={noiseCancellationOn ? "var(--mantine-color-teal-4)" : "light-dark(rgba(0,0,0,0.3), rgba(255,255,255,0.4))"} />
                                    <Text size="xs">Noise cancellation</Text>
                                </Group>
                                <Switch
                                    size="xs"
                                    checked={noiseCancellationOn}
                                    onChange={onToggleNoiseCancellation}
                                    styles={{ track: { cursor: "pointer" } }}
                                />
                            </Group>

                            <Group justify="space-between">
                                <Group gap={8}>
                                    <IconCameraFilled size={14} color={backgroundBlurOn ? "var(--mantine-color-violet-4)" : "light-dark(rgba(0,0,0,0.3), rgba(255,255,255,0.4))"} />
                                    <Text size="xs">Background blur</Text>
                                </Group>
                                <Switch
                                    size="xs"
                                    checked={backgroundBlurOn}
                                    onChange={onToggleBackgroundBlur}
                                    disabled={!cameraOn}
                                    styles={{ track: { cursor: cameraOn ? "pointer" : "not-allowed" } }}
                                />
                            </Group>
                        </Stack>
                    </Box>

                    <Divider color="light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))" />

                    {/* ── Network ── */}
                    <Box style={{ padding: "12px 16px 14px" }}>
                        <Text size="10px" fw={700} c="dimmed" style={{ textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                            Network
                        </Text>
                        {networkStats ? (() => {
                            const qualityColor = {
                                excellent: "teal",
                                good: "green",
                                fair: "yellow",
                                poor: "red",
                            }[networkStats.quality];
                            const qualityPercent = {
                                excellent: 100,
                                good: 75,
                                fair: 45,
                                poor: 15,
                            }[networkStats.quality];
                            return (
                                <Stack gap={10}>
                                    {/* Quality bar */}
                                    <Box>
                                        <Group justify="space-between" mb={4}>
                                            <Group gap={6}>
                                                <IconWifi size={13} color={`var(--mantine-color-${qualityColor}-4)`} />
                                                <Text size="xs" fw={500}>Connection</Text>
                                            </Group>
                                            <Text size="xs" fw={600} c={`${qualityColor}.4`} style={{ textTransform: "capitalize" }}>
                                                {networkStats.quality}
                                            </Text>
                                        </Group>
                                        <Progress
                                            value={qualityPercent}
                                            color={qualityColor}
                                            size={4}
                                            radius="xl"
                                            style={{ background: "light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.06))" }}
                                        />
                                    </Box>

                                    {/* Stat grid */}
                                    <Group grow gap="xs">
                                        <Paper
                                            radius="md"
                                            style={{
                                                background: "light-dark(rgba(0,0,0,0.03), rgba(255,255,255,0.04))",
                                                border: "1px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))",
                                                padding: "8px 10px",
                                                textAlign: "center",
                                            }}
                                        >
                                            <Text size="10px" c="dimmed" style={{ lineHeight: 1, marginBottom: 4 }}>Latency</Text>
                                            <Text size="xs" fw={700} style={{ lineHeight: 1 }}>{networkStats.rtt} ms</Text>
                                        </Paper>
                                        <Paper
                                            radius="md"
                                            style={{
                                                background: "light-dark(rgba(0,0,0,0.03), rgba(255,255,255,0.04))",
                                                border: "1px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))",
                                                padding: "8px 10px",
                                                textAlign: "center",
                                            }}
                                        >
                                            <Text size="10px" c="dimmed" style={{ lineHeight: 1, marginBottom: 4 }}>Loss</Text>
                                            <Text size="xs" fw={700} style={{ lineHeight: 1 }}>{networkStats.packetLoss}%</Text>
                                        </Paper>
                                    </Group>

                                    <Group grow gap="xs">
                                        <Paper
                                            radius="md"
                                            style={{
                                                background: "light-dark(rgba(0,0,0,0.03), rgba(255,255,255,0.04))",
                                                border: "1px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))",
                                                padding: "8px 10px",
                                            }}
                                        >
                                            <Group gap={4} justify="center">
                                                <IconArrowUp size={11} color="var(--mantine-color-teal-4)" />
                                                <Text size="10px" c="dimmed" style={{ lineHeight: 1 }}>Upload</Text>
                                            </Group>
                                            <Text size="xs" fw={700} ta="center" style={{ lineHeight: 1, marginTop: 4 }}>
                                                {networkStats.uplinkKbps > 1024
                                                    ? `${(networkStats.uplinkKbps / 1024).toFixed(1)} Mbps`
                                                    : `${networkStats.uplinkKbps} Kbps`
                                                }
                                            </Text>
                                        </Paper>
                                        <Paper
                                            radius="md"
                                            style={{
                                                background: "light-dark(rgba(0,0,0,0.03), rgba(255,255,255,0.04))",
                                                border: "1px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))",
                                                padding: "8px 10px",
                                            }}
                                        >
                                            <Group gap={4} justify="center">
                                                <IconArrowDown size={11} color="var(--mantine-color-violet-4)" />
                                                <Text size="10px" c="dimmed" style={{ lineHeight: 1 }}>Download</Text>
                                            </Group>
                                            <Text size="xs" fw={700} ta="center" style={{ lineHeight: 1, marginTop: 4 }}>
                                                {networkStats.downlinkKbps > 1024
                                                    ? `${(networkStats.downlinkKbps / 1024).toFixed(1)} Mbps`
                                                    : `${networkStats.downlinkKbps} Kbps`
                                                }
                                            </Text>
                                        </Paper>
                                    </Group>
                                </Stack>
                            );
                        })() : (
                            <Group gap={6} justify="center" py={8}>
                                <Loader size={12} color="dimmed" />
                                <Text size="xs" c="dimmed">Measuring…</Text>
                            </Group>
                        )}
                    </Box>
                </Modal>

                {/* Separator + Home (doctor only) + End call */}
                <Box style={{ width: 1, height: 20, background: "light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.12))" }} />

                {userKind === "doctor" && (
                    <Tooltip label="Go to Dashboard" position="top">
                        <ActionIcon
                            size={40}
                            radius={999}
                            variant="light"
                            color="gray"
                            aria-label="Go to Dashboard"
                            onClick={() => {
                                onMinimize?.();
                                onNavigateDashboard();
                            }}
                            style={{
                                background: "light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.08))",
                                color: "light-dark(rgba(0,0,0,0.7), rgba(255,255,255,0.85))",
                            }}
                        >
                            <IconHome size={20} />
                        </ActionIcon>
                    </Tooltip>
                )}

                <Tooltip label="End call" position="top">
                    <ActionIcon
                        size={40}
                        radius={999}
                        color="red"
                        variant="filled"
                        aria-label="End call"
                        onClick={onEnd}
                        style={{ boxShadow: "0 4px 16px rgba(239,68,68,0.4)" }}
                    >
                        <IconPhone
                            size={20}
                            style={{ transform: "rotate(135deg)" }}
                        />
                    </ActionIcon>
                </Tooltip>
            </Group>
        </Box>
    );
}
