import { Box, Group, Skeleton, Stack, Text } from "@mantine/core";

/**
 * Full-screen skeleton that mirrors the MeetingRoom layout so the transition
 * from loading → ready feels seamless. Matches the dark-chrome video-call UI.
 *
 * Uses CSS keyframe animations for a polished, alive feeling instead of
 * static skeletons.
 */
export default function MeetLoading() {
    return (
        <Box
            style={{
                position: "fixed",
                inset: 0,
                background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))",
                display: "flex",
                flexDirection: "column",
                animation: "meet-fade-in 0.3s ease-out",
            }}
        >
            {/* Keyframe animations */}
            <style>{`
                @keyframes meet-fade-in {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes meet-skeleton-pulse {
                    0%, 100% { opacity: 0.4; }
                    50%      { opacity: 0.8; }
                }
                @keyframes meet-glow-ring {
                    0%   { transform: scale(0.92); opacity: 0.3; }
                    50%  { transform: scale(1.08); opacity: 0.7; }
                    100% { transform: scale(0.92); opacity: 0.3; }
                }
                @keyframes meet-float {
                    0%, 100% { transform: translateY(0); }
                    50%      { transform: translateY(-6px); }
                }
                @keyframes meet-slide-up {
                    from { opacity: 0; transform: translateY(16px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes meet-dot-bounce {
                    0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
                    40%           { transform: scale(1);   opacity: 1; }
                }
                @keyframes meet-bar-shimmer {
                    from { transform: translateX(-100%); }
                    to   { transform: translateX(200%); }
                }
            `}</style>

            {/* ── Header island skeleton ─────────────────────────── */}
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
                    animation: "meet-slide-up 0.5s ease-out 0.1s both",
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
                        boxShadow:
                            "0 8px 32px light-dark(rgba(0,0,0,0.08), rgba(0,0,0,0.5)), 0 0 0 0.5px light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.06)) inset",
                        minHeight: 36,
                    }}
                >
                    <Skeleton height={12} width={80} radius="xl" animate />
                    <Box
                        style={{
                            width: 1,
                            height: 14,
                            background: "light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.12))",
                        }}
                    />
                    <Group gap={6}>
                        {/* Animated connecting dots */}
                        <Group gap={3}>
                            {[0, 1, 2].map((i) => (
                                <Box
                                    key={i}
                                    style={{
                                        width: 5,
                                        height: 5,
                                        borderRadius: "50%",
                                        background: "light-dark(rgba(0,0,0,0.3), rgba(255,255,255,0.4))",
                                        animation: `meet-dot-bounce 1.4s ease-in-out ${i * 0.16}s infinite`,
                                    }}
                                />
                            ))}
                        </Group>
                        <Text size="xs" c="dimmed">
                            Setting up…
                        </Text>
                    </Group>
                </Group>
            </Box>

            {/* ── Video area — animated avatar placeholder ────────── */}
            <Box style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                <Box
                    style={{
                        position: "absolute",
                        inset: 0,
                        overflow: "hidden",
                        background:
                            "radial-gradient(ellipse at 50% 40%, light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-8)) 0%, light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9)) 70%)",
                    }}
                >
                    <Stack align="center" justify="center" h="100%" gap="md">
                        {/* Outer glow ring */}
                        <Box
                            style={{
                                position: "relative",
                                animation: "meet-float 3s ease-in-out infinite",
                            }}
                        >
                            <Box
                                style={{
                                    position: "absolute",
                                    inset: -16,
                                    borderRadius: "50%",
                                    background: "radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)",
                                    animation: "meet-glow-ring 2.5s ease-in-out infinite",
                                }}
                            />
                            <Box
                                style={{
                                    width: 96,
                                    height: 96,
                                    borderRadius: "50%",
                                    background: "light-dark(rgba(99,102,241,0.12), rgba(99,102,241,0.15))",
                                    border: "2px solid light-dark(rgba(99,102,241,0.2), rgba(99,102,241,0.25))",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    animation: "meet-skeleton-pulse 2s ease-in-out infinite",
                                }}
                            >
                                {/* Inner shimmer effect */}
                                <Box
                                    style={{
                                        width: 40,
                                        height: 4,
                                        borderRadius: 2,
                                        background: "light-dark(rgba(99,102,241,0.2), rgba(99,102,241,0.25))",
                                        overflow: "hidden",
                                        position: "relative",
                                    }}
                                >
                                    <Box
                                        style={{
                                            position: "absolute",
                                            inset: 0,
                                            background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent)",
                                            animation: "meet-bar-shimmer 1.8s ease-in-out infinite",
                                        }}
                                    />
                                </Box>
                            </Box>
                        </Box>
                        <Text
                            c="dimmed"
                            size="sm"
                            style={{
                                animation: "meet-skeleton-pulse 2s ease-in-out infinite 0.3s",
                            }}
                        >
                            Connecting…
                        </Text>
                    </Stack>
                </Box>

                {/* ── Local PIP skeleton (bottom-left) ──────────── */}
                <Box
                    style={{
                        position: "absolute",
                        bottom: 90,
                        left: 16,
                        zIndex: 10,
                        animation: "meet-slide-up 0.5s ease-out 0.3s both",
                    }}
                >
                    <Box
                        style={{
                            width: 72,
                            height: 72,
                            borderRadius: "50%",
                            background: "light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))",
                            border: "2px solid light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.15))",
                            animation: "meet-skeleton-pulse 2s ease-in-out infinite 0.5s",
                        }}
                    />
                </Box>
            </Box>

            {/* ── Controls bar skeleton ──────────────────────────── */}
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
                    animation: "meet-slide-up 0.5s ease-out 0.2s both",
                }}
            >
                <Group
                    justify="center"
                    gap="sm"
                    style={{
                        background: "light-dark(rgba(255,255,255,0.85), rgba(30,30,30,0.85))",
                        backdropFilter: "blur(24px)",
                        WebkitBackdropFilter: "blur(24px)",
                        border: "1px solid light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.08))",
                        borderRadius: 999,
                        padding: "8px 20px",
                        boxShadow:
                            "0 8px 32px light-dark(rgba(0,0,0,0.08), rgba(0,0,0,0.5)), 0 0 0 0.5px light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.06)) inset",
                    }}
                >
                    {/* Control button skeletons with staggered animation */}
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                        <Box
                            key={i}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: "50%",
                                background: "light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))",
                                animation: `meet-skeleton-pulse 2s ease-in-out ${i * 0.1}s infinite`,
                            }}
                        />
                    ))}
                    {/* End call skeleton */}
                    <Box
                        style={{
                            width: 52,
                            height: 40,
                            borderRadius: 999,
                            background: "light-dark(rgba(239,68,68,0.15), rgba(239,68,68,0.2))",
                            animation: "meet-skeleton-pulse 2s ease-in-out 0.6s infinite",
                        }}
                    />
                </Group>
            </Box>
        </Box>
    );
}
