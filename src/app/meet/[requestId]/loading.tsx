import { Box, Group, Loader, Skeleton, Stack, Text } from "@mantine/core";

/**
 * Full-screen skeleton that mirrors the MeetingRoom layout so the transition
 * from loading → ready feels seamless. Matches the dark-chrome video-call UI.
 */
export default function MeetLoading() {
    return (
        <Box
            style={{
                position: "fixed",
                inset: 0,
                background: "light-dark(#f5f5f7, #0f0f0f)",
                display: "flex",
                flexDirection: "column",
            }}
        >
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
                    <Skeleton height={12} width={80} radius="xl" />
                    <Box
                        style={{
                            width: 1,
                            height: 14,
                            background: "light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.12))",
                        }}
                    />
                    <Group gap={6}>
                        <Loader size={12} color="light-dark(rgba(0,0,0,0.3), rgba(255,255,255,0.4))" type="dots" />
                        <Text size="xs" c="dimmed">
                            Setting up…
                        </Text>
                    </Group>
                </Group>
            </Box>

            {/* ── Video area — centered avatar placeholder ────────── */}
            <Box style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                <Box
                    style={{
                        position: "absolute",
                        inset: 0,
                        overflow: "hidden",
                        background:
                            "radial-gradient(ellipse at 50% 40%, light-dark(#e8e8f0, #1a1a2e) 0%, light-dark(#f0f0f4, #0f0f0f) 70%)",
                    }}
                >
                    <Stack align="center" justify="center" h="100%" gap="md">
                        <Loader color="primary" size="lg" />
                        <Text c="dimmed" size="sm">
                            Connecting…
                        </Text>
                    </Stack>
                </Box>

                {/* ── Local PIP skeleton (bottom-right) ──────────── */}
                <Box
                    style={{
                        position: "absolute",
                        bottom: 90,
                        right: 16,
                        zIndex: 10,
                    }}
                >
                    <Skeleton
                        width={72}
                        height={72}
                        circle
                        style={{
                            border: "2px solid light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.15))",
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
                    {/* Mic */}
                    <Skeleton width={40} height={40} circle />
                    {/* Camera */}
                    <Skeleton width={40} height={40} circle />
                    {/* Captions */}
                    <Skeleton width={40} height={40} circle />
                    {/* Settings */}
                    <Skeleton width={40} height={40} circle />
                    {/* Record */}
                    <Skeleton width={40} height={40} circle />
                    {/* Network */}
                    <Skeleton width={40} height={40} circle />
                    {/* End call */}
                    <Skeleton
                        width={52}
                        height={40}
                        radius={999}
                    />
                </Group>
            </Box>
        </Box>
    );
}
