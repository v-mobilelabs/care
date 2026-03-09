"use client";
import {
    Box,
    Button,
    Divider,
    Group,
    Paper,
    ScrollArea,
    Stack,
    Text,
    ThemeIcon,
    Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconFileDescription, IconLogout, IconShieldLock } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { signOut } from "@/lib/auth/sign-out";
import { CONSENT_KEY } from "@/app/(portal)/patient/_components/consent-gate";

// ── Section block ─────────────────────────────────────────────────────────────

function ConsentBlock({
    title,
    children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
    return (
        <Stack gap="xs">
            <Text fw={600} size="sm">{title}</Text>
            <Text size="sm" c="dimmed">{children}</Text>
        </Stack>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ConsentPage() {
    const router = useRouter();
    const [, startRouting] = useTransition();

    async function handleWithdrawConsent() {
        localStorage.removeItem(CONSENT_KEY);
        await signOut();
        startRouting(() => { router.replace("/auth/login"); });
    }

    function confirmWithdraw() {
        modals.openConfirmModal({
            title: "Withdraw consent & sign out?",
            children: (
                <Text size="sm">
                    Withdrawing consent will sign you out. You will need to accept the consent
                    form again to use CareAI.
                </Text>
            ),
            labels: { confirm: "Withdraw & sign out", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => void handleWithdrawConsent(),
        });
    }

    return (
        <Box style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            {/* Page header */}
            <Box
                px={{ base: "md", sm: "xl" }}
                py="md"
                style={{
                    flexShrink: 0,
                    borderBottom: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                    background: "light-dark(white, var(--mantine-color-dark-8))",
                }}
            >
                <Group gap="sm">
                    <ThemeIcon size={34} radius="md" color="blue" variant="light">
                        <IconShieldLock size={18} />
                    </ThemeIcon>
                    <Box>
                        <Title order={5} lh={1.2}>Consent &amp; Privacy</Title>
                        <Text size="xs" c="dimmed">Review and manage your data usage consent</Text>
                    </Box>
                </Group>
            </Box>

            {/* Scrollable content */}
            <Box style={{ flex: 1, overflow: "hidden" }}>
                <ScrollArea style={{ height: "100%" }}>
                    <Box px={{ base: "md", sm: "xl" }} py="lg" maw={600} mx="auto">
                        <Stack gap="md">
                            {/* Informed consent document */}
                            <Paper withBorder radius="lg" p="xl">
                                <Stack gap="md">
                                    <Group gap="sm">
                                        <ThemeIcon size={28} radius="md" color="blue" variant="light">
                                            <IconFileDescription size={16} />
                                        </ThemeIcon>
                                        <Box>
                                            <Text fw={600} size="sm">Informed Consent &amp; Terms of Use</Text>
                                            <Text size="xs" c="dimmed">Last updated March 2026</Text>
                                        </Box>
                                    </Group>
                                    <Divider />
                                    <ConsentBlock title="AI — Not a Licensed Medical Provider">
                                        CareAI is an AI-powered health assistant. It does{" "}
                                        <strong>not</strong> provide medical diagnosis, treatment, or
                                        professional medical advice. Always consult a qualified healthcare
                                        professional for medical decisions. In an emergency, call 911 or
                                        your local emergency number immediately.
                                    </ConsentBlock>
                                    <Divider />
                                    <ConsentBlock title="Data Collection &amp; Use">
                                        By using CareAI, you consented to the collection and processing
                                        of health symptoms, AI-generated SOAP notes, session history, and
                                        your email address. Your data is stored securely and is never sold
                                        to third parties.
                                    </ConsentBlock>
                                    <Divider />
                                    <ConsentBlock title="Privacy &amp; Security">
                                        All data is encrypted in transit and at rest. Conversation data is
                                        used to generate clinical summaries (SOAP notes) accessible only
                                        to you.
                                    </ConsentBlock>
                                    <Divider />
                                    <ConsentBlock title="Limitations of Liability">
                                        CareAI is provided as-is for informational purposes only.
                                        CosmoOps and its affiliates are not liable for any health outcomes
                                        or decisions taken based on information provided by this service.
                                    </ConsentBlock>
                                </Stack>
                            </Paper>

                            {/* Withdraw consent */}
                            <Paper withBorder radius="lg" p="xl">
                                <Stack gap="md">
                                    <Box>
                                        <Text fw={600} size="sm">Withdraw consent</Text>
                                        <Text size="xs" c="dimmed" mt={2}>
                                            Removes your consent and signs you out. You will need to accept
                                            the consent form again to continue using CareAI.
                                        </Text>
                                    </Box>
                                    <Group>
                                        <Button
                                            variant="light"
                                            color="red"
                                            leftSection={<IconLogout size={16} />}
                                            onClick={confirmWithdraw}
                                        >
                                            Withdraw &amp; sign out
                                        </Button>
                                    </Group>
                                </Stack>
                            </Paper>
                        </Stack>
                    </Box>
                </ScrollArea>
            </Box>
        </Box>
    );
}
