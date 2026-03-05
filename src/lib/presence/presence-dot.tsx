/**
 * PresenceDot — shows a small online/offline indicator for a user.
 *
 * Online  → solid teal dot with an expanding ping ring behind it.
 * Offline → solid grey dot, no animation.
 *
 * Usage:
 *   <PresenceDot uid={doctor.userId} />                     // 10 px dot (default)
 *   <PresenceDot uid={doctor.userId} size="md" withLabel />  // with "Online" text
 */
"use client";
import { Box, Group, Text, Tooltip } from "@mantine/core";
import { usePresenceStatus } from "@/lib/presence/use-presence-status";

interface PresenceDotProps {
    uid: string | null | undefined;
    /** Dot diameter. Default: "sm" (10 px). */
    size?: "xs" | "sm" | "md";
    /** Show an "Online" / "Offline" label next to the dot. */
    withLabel?: boolean;
}

// Inner solid dot sizes (px)
const DOT_SIZE: Record<NonNullable<PresenceDotProps["size"]>, number> = {
    xs: 7,
    sm: 10,
    md: 13,
};

export function PresenceDot({ uid, size = "sm", withLabel = false }: Readonly<PresenceDotProps>) {
    const { online } = usePresenceStatus(uid);

    const px = DOT_SIZE[size];
    const label = online ? "Online" : "Offline";

    return (
        <Tooltip label={label} withArrow position="top">
            <Group gap={6} wrap="nowrap" style={{ display: "inline-flex", alignItems: "center" }}>
                {/* Wrapper holds the stacked solid dot + ping ring */}
                <Box
                    style={{
                        position: "relative",
                        width: px,
                        height: px,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    {/* Ping ring — only rendered when online */}
                    {online && (
                        <Box
                            style={{
                                position: "absolute",
                                inset: 0,
                                borderRadius: "50%",
                                backgroundColor: "var(--mantine-color-teal-4)",
                                animation: "presence-ping 1.5s ease-out infinite",
                            }}
                        />
                    )}
                    {/* Solid inner dot */}
                    <Box
                        style={{
                            position: "relative",
                            width: px,
                            height: px,
                            borderRadius: "50%",
                            backgroundColor: online
                                ? "var(--mantine-color-teal-5)"
                                : "var(--mantine-color-gray-5)",
                            boxShadow: online
                                ? "0 0 0 1.5px var(--mantine-color-teal-3)"
                                : undefined,
                        }}
                    />
                </Box>

                {withLabel && (
                    <Text
                        size="xs"
                        c={online ? "teal" : "dimmed"}
                        fw={600}
                        style={{ letterSpacing: "0.01em" }}
                    >
                        {label}
                    </Text>
                )}
            </Group>
        </Tooltip>
    );
}
