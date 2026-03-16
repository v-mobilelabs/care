"use client";
import {
    Box,
    Button,
    Divider,
    Group,
    List,
    Paper,
    ScrollArea,
    Stack,
    Text,
    ThemeIcon,
    Title,
} from "@mantine/core";
import {
    IconAlertTriangle,
    IconCheck,
    IconDatabase,
    IconRobot,
    IconShieldLock,
    IconX,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { signOut } from "@/lib/auth/sign-out";
import { Logo } from "@/ui/brand/logo";
import { colors, spacing } from "@/ui/tokens";
import { useConsentMutation } from "@/ui/chat/query";

// ── Storage key ───────────────────────────────────────────────────────────────

export const CONSENT_KEY = "sd_consent_v1";

export function hasConsented(): boolean {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(CONSENT_KEY) === "accepted";
}

// ── Consent Gate ──────────────────────────────────────────────────────────────

interface ConsentGateProps {
    readonly onAccept: () => void;
}

export function ConsentGate({ onAccept }: ConsentGateProps) {
    const router = useRouter();
    const [declining, setDeclining] = useState(false);
    const consentMutation = useConsentMutation();

    async function handleAccept() {
        localStorage.setItem(CONSENT_KEY, "accepted");
        // Persist to the user's profile so consent survives across devices
        // and browser storage clears. Fire-and-forget — don't block the UX.
        consentMutation.mutate();
        onAccept();
    }

    async function handleDecline() {
        setDeclining(true);
        await signOut();
        router.replace("/auth/login");
    }

    return (
        <Box
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 1000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "light-dark(rgba(255,255,255,0.92), rgba(0,0,0,0.85))",
                backdropFilter: "blur(10px)",
                padding: spacing.lg,
            }}
        >
            <Paper
                withBorder
                radius="lg"
                p={0}
                style={{ width: "100%", maxWidth: 620, overflow: "hidden" }}
            >
                {/* Header */}
                <Box
                    p="xl"
                    style={{
                        background: "light-dark(var(--mantine-color-primary-0), var(--mantine-color-primary-9))",
                        borderBottom: "1px solid var(--mantine-color-default-border)",
                    }}
                >
                    <Stack gap="xs">
                        <Logo />
                        <Title order={3} mt={4}>Informed Consent & Terms of Use</Title>
                        <Text size="sm" c="dimmed">
                            Please read and accept the following before using CareAI.
                        </Text>
                    </Stack>
                </Box>

                {/* Scrollable body */}
                <ScrollArea h={340} p="xl">
                    <Stack gap="lg" p="xl">

                        {/* AI Disclaimer */}
                        <Stack gap="xs">
                            <Group gap="xs">
                                <ThemeIcon size={22} radius="sm" color="orange" variant="light">
                                    <IconRobot size={13} />
                                </ThemeIcon>
                                <Text fw={600} size="sm">AI — Not a Licensed Medical Provider</Text>
                            </Group>
                            <Text size="sm" c="dimmed">
                                CareAI is an AI-powered health assistant. It does <strong>not</strong> provide
                                medical diagnosis, treatment, or professional medical advice. Always consult a
                                qualified healthcare professional for medical decisions. In an emergency, call
                                911 or your local emergency number immediately.
                            </Text>
                        </Stack>

                        <Divider />

                        {/* Data collection */}
                        <Stack gap="xs">
                            <Group gap="xs">
                                <ThemeIcon size={22} radius="sm" color="blue" variant="light">
                                    <IconDatabase size={13} />
                                </ThemeIcon>
                                <Text fw={600} size="sm">Data Collection & Use</Text>
                            </Group>
                            <Text size="sm" c="dimmed">
                                By using CareAI, you consent to the collection and processing of:
                            </Text>
                            <List size="sm" spacing={4} c="dimmed" withPadding>
                                <List.Item>Health symptoms and information you share in conversations</List.Item>
                                <List.Item>AI-generated SOAP notes and condition assessments</List.Item>
                                <List.Item>Session history and usage data to improve the service</List.Item>
                                <List.Item>Account identifiers (email address)</List.Item>
                            </List>
                            <Text size="sm" c="dimmed" mt={4}>
                                Your data is stored securely and is never sold to third parties.
                                You may request deletion of your data at any time.
                            </Text>
                        </Stack>

                        <Divider />

                        {/* Privacy */}
                        <Stack gap="xs">
                            <Group gap="xs">
                                <ThemeIcon size={22} radius="sm" color="teal" variant="light">
                                    <IconShieldLock size={13} />
                                </ThemeIcon>
                                <Text fw={600} size="sm">Privacy & Security</Text>
                            </Group>
                            <Text size="sm" c="dimmed">
                                All data is encrypted in transit and at rest. CareAI complies with applicable
                                privacy regulations. Conversation data is used to generate clinical summaries
                                (SOAP notes) accessible only to you.
                            </Text>
                        </Stack>

                        <Divider />

                        {/* Limitations */}
                        <Stack gap="xs">
                            <Group gap="xs">
                                <ThemeIcon size={22} radius="sm" color="yellow" variant="light">
                                    <IconAlertTriangle size={13} />
                                </ThemeIcon>
                                <Text fw={600} size="sm">Limitations of Liability</Text>
                            </Group>
                            <Text size="sm" c="dimmed">
                                CareAI is provided as-is for informational purposes only. CosmoOps and its
                                affiliates are not liable for any health outcomes, decisions, or actions taken
                                based on information provided by this service. AI-generated content may contain
                                errors and should not replace professional clinical judgment.
                            </Text>
                        </Stack>

                    </Stack>
                </ScrollArea>

                {/* Footer */}
                <Box
                    p="xl"
                    style={{
                        borderTop: "1px solid var(--mantine-color-default-border)",
                        background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))",
                    }}
                >
                    <Stack gap="xs">
                        <Text size="xs" c="dimmed">
                            By clicking <strong>I Agree</strong>, you confirm that you have read, understood,
                            and accept these terms. You must be 18 years of age or older to use CareAI.
                        </Text>
                        <Group justify="flex-end" gap="sm" mt={4}>
                            <Button
                                variant="subtle"
                                color="gray"
                                leftSection={<IconX size={14} />}
                                onClick={handleDecline}
                                loading={declining}
                            >
                                Sign out
                            </Button>
                            <Button
                                color={colors.success}
                                leftSection={<IconCheck size={14} />}
                                onClick={handleAccept}
                            >
                                I Agree
                            </Button>
                        </Group>
                    </Stack>
                </Box>
            </Paper>
        </Box>
    );
}
