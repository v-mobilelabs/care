"use client";
/**
 * WaitingQueueIsland — floating Dynamic Island-style badge for **doctors**.
 *
 * Shows the number of patients waiting in the queue (pending call requests).
 * Visible across all pages. Tapping it navigates to the doctor dashboard.
 *
 * Mounted in the root layout alongside ActiveCallIsland.
 */
import { Box, Group, Loader, Text, UnstyledButton } from "@mantine/core";
import { IconUsers } from "@tabler/icons-react";
import Link from "next/link";
import { useLinkStatus } from "next/link";
import { useState } from "react";
import { useAuth } from "@/ui/providers/auth-provider";
import { useDoctorCallQueue } from "@/lib/meet/use-doctor-call-queue";

function WaitingIslandContent({ pendingCount }: Readonly<{ pendingCount: number }>) {
    const { pending } = useLinkStatus();
    return (
        <>
            {/* Pulsing count badge */}
            <Box
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "var(--mantine-color-primary-6)",
                    animation: "wqi-pulse 2s ease-in-out infinite",
                    flexShrink: 0,
                }}
            >
                {pending ? (
                    <Loader size={10} color="white" type="dots" />
                ) : (
                    <Text size="xs" fw={700} style={{ color: "#fff", lineHeight: 1 }}>
                        {pendingCount}
                    </Text>
                )}
            </Box>

            <Group gap={6} wrap="nowrap">
                <IconUsers size={14} color="rgba(255,255,255,0.8)" />
                <Text
                    size="xs"
                    fw={600}
                    style={{
                        color: "rgba(255,255,255,0.9)",
                        letterSpacing: 0.2,
                    }}
                >
                    {pendingCount === 1 ? "patient waiting" : "patients waiting"}
                </Text>
            </Group>
        </>
    );
}

export function WaitingQueueIsland() {
    const { user, kind } = useAuth();
    const queue = useDoctorCallQueue(kind === "doctor" ? user?.uid : undefined);
    const [hovered, setHovered] = useState(false);

    // Only count pending (not accepted) entries
    const pendingCount = queue.filter((c) => c.status === "pending").length;

    // Don't render for non-doctors or when queue is empty
    if (kind !== "doctor" || pendingCount === 0) return null;

    // Don't render if there's an active (accepted) call — ActiveCallIsland takes that slot
    const hasActiveCall = queue.some((c) => c.status === "accepted");
    if (hasActiveCall) return null;

    const label = pendingCount === 1
        ? "1 patient waiting"
        : `${pendingCount} patients waiting`;

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
                @keyframes wqi-appear {
                    from { transform: scaleX(0.3) scaleY(0.6); opacity: 0; }
                    to   { transform: scaleX(1) scaleY(1);     opacity: 1; }
                }
                @keyframes wqi-pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(107,79,248,0.4); }
                    50%      { box-shadow: 0 0 0 6px rgba(107,79,248,0); }
                }
            `}</style>
            <UnstyledButton
                component={Link}
                href="/doctor/dashboard"
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                aria-label={label}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    height: 36,
                    paddingLeft: 10,
                    paddingRight: 14,
                    borderRadius: 20,
                    background: "light-dark(#1a1a1a, #1a1a1a)",
                    color: "#fff",
                    cursor: "pointer",
                    animation: "wqi-appear 0.4s cubic-bezier(0.34,1.36,0.64,1) both",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    transform: hovered ? "scale(1.04)" : "scale(1)",
                    boxShadow: hovered
                        ? "0 4px 20px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)"
                        : "0 2px 10px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.06)",
                }}
            >
                <WaitingIslandContent pendingCount={pendingCount} />
            </UnstyledButton>
        </Box>
    );
}
