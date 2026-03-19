"use client";
/**
 * QueuePositionIsland — floating Dynamic Island-style badge for **patients**.
 *
 * Shows the patient's position in the doctor's call queue when they have a
 * pending call request. Visible across all pages so the patient never loses
 * sight of their queue position, even if they navigate away from /chat/connect.
 *
 * Clicking navigates back to the connect page.
 *
 * Mounted in the root layout alongside ActiveCallIsland.
 */
import { Box, Group, Loader, Text, UnstyledButton } from "@mantine/core";
import { IconClock } from "@tabler/icons-react";
import Link, { useLinkStatus } from "@/ui/link";
import { useState } from "react";
import { useAuth } from "@/ui/providers/auth-provider";
import { useCallState } from "@/lib/meet/use-call-state";

function QueueIslandContent({ pos, isNext }: Readonly<{ pos: number; isNext: boolean }>) {
    const { pending } = useLinkStatus();
    return (
        <>
            {/* Position badge */}
            <Box
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: isNext
                        ? "var(--mantine-color-teal-6)"
                        : "var(--mantine-color-primary-6)",
                    animation: isNext ? "qpi-pulse 2s ease-in-out infinite" : undefined,
                    flexShrink: 0,
                }}
            >
                {pending ? (
                    <Loader size={10} color="white" type="dots" />
                ) : (
                    <Text size="xs" fw={700} style={{ color: "var(--mantine-color-white)", lineHeight: 1 }}>
                        {pos}
                    </Text>
                )}
            </Box>

            <Group gap={6} wrap="nowrap">
                <IconClock size={14} color={isNext ? "var(--mantine-color-teal-6)" : "rgba(255,255,255,0.8)"} />
                <Text
                    size="xs"
                    fw={600}
                    style={{
                        color: isNext ? "var(--mantine-color-teal-6)" : "rgba(255,255,255,0.9)",
                        letterSpacing: 0.2,
                    }}
                >
                    {isNext ? "You\u2019re next!" : `#${pos} in queue`}
                </Text>
            </Group>
        </>
    );
}

export function QueuePositionIsland() {
    const { user, kind } = useAuth();
    const callState = useCallState(kind === "user" ? user?.uid : undefined);
    const [hovered, setHovered] = useState(false);

    // Only show for patients with a pending call that has a queue position
    if (kind !== "user") return null;
    if (callState.status !== "pending") return null;
    if (callState.queuePosition == null) return null;

    const pos = callState.queuePosition;
    const isNext = pos === 1;

    return (
        <Box
            style={{
                position: "fixed",
                top: 8,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 10000,
                pointerEvents: "auto",
            }}
        >
            <style>{`
                @keyframes qpi-appear {
                    from { transform: scaleX(0.3) scaleY(0.6); opacity: 0; }
                    to   { transform: scaleX(1) scaleY(1);     opacity: 1; }
                }
                @keyframes qpi-pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(32,178,170,0.4); }
                    50%      { box-shadow: 0 0 0 6px rgba(32,178,170,0); }
                }
            `}</style>
            <UnstyledButton
                component={Link}
                href="/patient/connect"
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                aria-label={isNext ? "You're next in queue" : `#${pos} in queue`}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    height: 36,
                    paddingLeft: 10,
                    paddingRight: 14,
                    borderRadius: 20,
                    background: "light-dark(var(--mantine-color-dark-9), var(--mantine-color-dark-9))",
                    color: "var(--mantine-color-white)",
                    cursor: "pointer",
                    animation: "qpi-appear 0.4s cubic-bezier(0.34,1.36,0.64,1) both",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    transform: hovered ? "scale(1.04)" : "scale(1)",
                    boxShadow: hovered
                        ? "0 4px 20px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)"
                        : "0 2px 10px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.06)",
                }}
            >
                <QueueIslandContent pos={pos} isNext={isNext} />
            </UnstyledButton>
        </Box>
    );
}
