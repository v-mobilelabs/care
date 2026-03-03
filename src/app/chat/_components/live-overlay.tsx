"use client";
import { Box, Button, Text } from "@mantine/core";
import {
    IconMicrophone,
    IconPhoneOff,
    IconRobot,
    IconWaveSine,
} from "@tabler/icons-react";

export interface LiveOverlayProps {
    livePhase: "idle" | "listening" | "thinking" | "speaking";
    liveAIText: string;
    liveTranscript: string;
    onClose: () => void;
}

export function LiveOverlay({ livePhase, liveAIText, liveTranscript, onClose }: Readonly<LiveOverlayProps>) {
    return (
        <Box
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 200,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "light-dark(rgba(248,249,250,0.95), rgba(14,14,22,0.95))",
                backdropFilter: "blur(20px)",
            }}
        >
            {/* Animated orb */}
            <Box
                style={{
                    position: "relative",
                    width: 160,
                    height: 160,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 40,
                }}
            >
                {/* Ripple ring */}
                <Box
                    style={{
                        position: "absolute",
                        inset: -32,
                        borderRadius: "50%",
                        animation: (() => {
                            if (livePhase === "speaking") return "live-ripple 1.5s ease-out infinite";
                            if (livePhase === "listening") return "live-pulse 1.8s ease-in-out infinite";
                            if (livePhase === "thinking") return "live-pulse 0.7s ease-in-out infinite";
                            return "none";
                        })(),
                        background: livePhase === "speaking"
                            ? "rgba(32,201,151,0.08)"
                            : "rgba(99,102,241,0.08)",
                    }}
                />
                {/* Core orb */}
                <Box
                    style={{
                        width: 140,
                        height: 140,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: (() => {
                            if (livePhase === "speaking") return "linear-gradient(135deg, var(--mantine-color-teal-5), var(--mantine-color-cyan-4))";
                            if (livePhase === "listening") return "linear-gradient(135deg, var(--mantine-color-primary-5), var(--mantine-color-violet-5))";
                            return "linear-gradient(135deg, var(--mantine-color-violet-5), var(--mantine-color-grape-5))";
                        })(),
                        boxShadow: (() => {
                            if (livePhase === "speaking") return "0 0 60px rgba(32,201,151,0.45)";
                            if (livePhase === "listening") return "0 0 60px rgba(99,102,241,0.45)";
                            return "0 0 40px rgba(168,85,247,0.35)";
                        })(),
                        animation: livePhase === "listening"
                            ? "live-pulse 1.8s ease-in-out infinite"
                            : livePhase === "thinking"
                                ? "live-pulse 0.7s ease-in-out infinite"
                                : "none",
                        transition: "background 0.6s ease, box-shadow 0.6s ease",
                    }}
                >
                    {(() => {
                        if (livePhase === "speaking") return <IconWaveSine size={52} color="white" />;
                        if (livePhase === "thinking") return <IconRobot size={52} color="white" />;
                        return <IconMicrophone size={52} color="white" />;
                    })()}
                </Box>
            </Box>

            <Text fw={700} size="xl" mb={8}>
                {(() => {
                    if (livePhase === "listening") return "Listening\u2026";
                    if (livePhase === "thinking") return "Thinking\u2026";
                    if (livePhase === "speaking") return "Speaking\u2026";
                    return "Ready";
                })()}
            </Text>

            <Box maw={520} mx="auto" ta="center" px="xl" style={{ minHeight: 88 }}>
                {(() => {
                    if (livePhase === "speaking" && liveAIText) {
                        return <Text size="sm" c="dimmed" lh={1.7} lineClamp={4}>{liveAIText}</Text>;
                    }
                    if (liveTranscript) {
                        return <Text size="sm" c="dimmed" lh={1.7} fs="italic" lineClamp={3}>&ldquo;{liveTranscript}&rdquo;</Text>;
                    }
                    return <Text size="sm" c="dimmed">Speak naturally — CareAI will respond when you pause.</Text>;
                })()}
            </Box>

            <Button
                mt={48}
                size="md"
                radius="xl"
                color="red"
                variant="filled"
                leftSection={<IconPhoneOff size={18} />}
                onClick={onClose}
            >
                End session
            </Button>
        </Box>
    );
}
