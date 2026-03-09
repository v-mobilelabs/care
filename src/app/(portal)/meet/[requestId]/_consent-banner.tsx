"use client";
/**
 * ConsentBanner — in-call health records consent request (patient-side).
 */
import { Box, Button, Group, Paper, Text } from "@mantine/core";
import { IconCheck, IconShieldCheck, IconX } from "@tabler/icons-react";
import type { Participant } from "./_room-types";

interface ConsentBannerProps {
    remoteUser: Participant;
    acceptingConsent: boolean;
    onAccept: () => void;
    onDecline: () => void;
}

export function ConsentBanner({
    remoteUser,
    acceptingConsent,
    onAccept,
    onDecline,
}: Readonly<ConsentBannerProps>) {
    return (
        <Box
            pos="absolute"
            style={{
                top: 16,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 20,
                width: "min(400px, 88%)",
            }}
        >
            <Paper
                style={{
                    background: "light-dark(rgba(255, 255, 255, 0.92), rgba(10, 10, 25, 0.92))",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(99, 102, 241, 0.4)",
                    borderRadius: 16,
                    padding: "14px 18px",
                }}
            >
                <Group gap="xs" mb={6}>
                    <IconShieldCheck size={18} color="var(--mantine-color-indigo-4)" />
                    <Text fw={600} size="sm">
                        Health Records Request
                    </Text>
                </Group>
                <Text c="dimmed" size="xs" mb="md" style={{ lineHeight: 1.5 }}>
                    {remoteUser.name} is requesting access to your health records
                    for this consultation.
                </Text>
                <Group gap="xs">
                    <Button
                        size="xs"
                        color="teal"
                        leftSection={<IconCheck size={13} />}
                        loading={acceptingConsent}
                        onClick={onAccept}
                    >
                        Accept
                    </Button>
                    <Button
                        size="xs"
                        color="red"
                        variant="subtle"
                        leftSection={<IconX size={13} />}
                        disabled={acceptingConsent}
                        onClick={onDecline}
                    >
                        Decline
                    </Button>
                </Group>
            </Paper>
        </Box>
    );
}
