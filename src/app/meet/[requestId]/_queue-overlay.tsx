"use client";
/**
 * QueueOverlay — shows patients waiting in queue (doctor-side only).
 */
import { Avatar, Badge, Box, Group, Paper, Stack, Text } from "@mantine/core";
import { IconUsers } from "@tabler/icons-react";
import { getInitials } from "@/lib/get-initials";
import type { IncomingCallEntry } from "@/lib/meet/use-doctor-call-queue";

interface QueueOverlayProps {
    pendingQueue: ReadonlyArray<IncomingCallEntry>;
}

export function QueueOverlay({ pendingQueue }: Readonly<QueueOverlayProps>) {
    if (pendingQueue.length === 0) return null;

    return (
        <Box
            style={{
                position: "absolute",
                top: 64,
                right: 16,
                zIndex: 10,
                pointerEvents: "auto",
                maxWidth: 220,
            }}
        >
            <Paper
                radius="lg"
                p="sm"
                style={{
                    background: "light-dark(rgba(255,255,255,0.88), rgba(30,30,30,0.88))",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    border: "1px solid light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.08))",
                    boxShadow: "0 8px 24px light-dark(rgba(0,0,0,0.08), rgba(0,0,0,0.4))",
                }}
            >
                <Group gap={6} mb={8}>
                    <IconUsers size={14} color="var(--mantine-color-orange-5)" />
                    <Text size="xs" fw={600}>
                        {pendingQueue.length} {pendingQueue.length === 1 ? "patient" : "patients"} waiting
                    </Text>
                </Group>
                <Stack gap={6}>
                    {pendingQueue.slice(0, 5).map((entry, idx) => (
                        <Group key={entry.requestId} gap={8} wrap="nowrap">
                            <Avatar
                                size={24}
                                radius="xl"
                                src={entry.patientPhotoUrl ?? undefined}
                                color="primary"
                                style={{ fontSize: 10, flexShrink: 0 }}
                            >
                                {getInitials(entry.patientName)}
                            </Avatar>
                            <Text size="xs" lineClamp={1} style={{ flex: 1 }}>
                                {entry.patientName}
                            </Text>
                            <Badge size="xs" variant="light" color="orange" style={{ flexShrink: 0 }}>
                                #{idx + 1}
                            </Badge>
                        </Group>
                    ))}
                    {pendingQueue.length > 5 && (
                        <Text size="xs" c="dimmed" ta="center">
                            +{pendingQueue.length - 5} more
                        </Text>
                    )}
                </Stack>
            </Paper>
        </Box>
    );
}
