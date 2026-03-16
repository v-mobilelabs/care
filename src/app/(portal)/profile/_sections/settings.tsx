"use client";
import {
    Box,
    Button,
    Card,
    Divider,
    Group,
    Stack,
    Text,
    ThemeIcon,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
    IconFileDescription,
    IconLogout,
    IconShieldCheck,
    IconShieldLock,
    IconTrash,
} from "@tabler/icons-react";
import { getAuth, deleteUser } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { firebaseApp } from "@/lib/firebase/client";
import { signOut } from "@/lib/auth/sign-out";
import { CONSENT_KEY } from "@/ui/chat/components/consent-gate";

// ── Action row ────────────────────────────────────────────────────────────────

function ActionRow({
    title,
    description,
    action,
}: Readonly<{ title: string; description: string; action: React.ReactNode }>) {
    return (
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            <Box style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={500}>{title}</Text>
                <Text size="xs" c="dimmed" mt={2}>{description}</Text>
            </Box>
            {action}
        </Group>
    );
}

// ── Consent & Privacy ─────────────────────────────────────────────────────────

export function ConsentSection() {
    const router = useRouter();
    const [, startRouting] = useTransition();

    function handleViewConsent() {
        modals.open({
            title: "Informed Consent & Terms of Use",
            size: "lg",
            children: (
                <Stack gap="lg" pb="md">
                    <Stack gap="xs">
                        <Text fw={600} size="sm">AI — Not a Licensed Medical Provider</Text>
                        <Text size="sm" c="dimmed">
                            CareAI is an AI-powered health assistant. It does <strong>not</strong> provide
                            medical diagnosis, treatment, or professional medical advice. Always consult a
                            qualified healthcare professional for medical decisions. In an emergency, call
                            911 or your local emergency number immediately.
                        </Text>
                    </Stack>
                    <Divider />
                    <Stack gap="xs">
                        <Text fw={600} size="sm">Data Collection &amp; Use</Text>
                        <Text size="sm" c="dimmed">
                            By using CareAI, you consented to the collection and processing of health
                            symptoms, AI-generated SOAP notes, session history, and your email address.
                            Your data is stored securely and is never sold to third parties.
                        </Text>
                    </Stack>
                    <Divider />
                    <Stack gap="xs">
                        <Text fw={600} size="sm">Privacy &amp; Security</Text>
                        <Text size="sm" c="dimmed">
                            All data is encrypted in transit and at rest. Conversation data is used to
                            generate clinical summaries (SOAP notes) accessible only to you.
                        </Text>
                    </Stack>
                    <Divider />
                    <Stack gap="xs">
                        <Text fw={600} size="sm">Limitations of Liability</Text>
                        <Text size="sm" c="dimmed">
                            CareAI is provided as-is for informational purposes only. CosmoOps and its
                            affiliates are not liable for any health outcomes or decisions taken based on
                            information provided by this service.
                        </Text>
                    </Stack>
                </Stack>
            ),
        });
    }

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
                    Withdrawing consent will sign you out. You will need to accept the consent form again to use CareAI.
                </Text>
            ),
            labels: { confirm: "Withdraw & sign out", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => void handleWithdrawConsent(),
        });
    }

    return (
        <Card withBorder radius="lg">
            <Card.Section withBorder style={{ background: "light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))" }}>
                <Group gap="sm" align="center" p="md">
                    <ThemeIcon size={36} radius="md" variant="light" color="blue">
                        <IconShieldCheck size={20} />
                    </ThemeIcon>
                    <Text fw={600} size="md">Privacy &amp; Consent</Text>
                </Group>
            </Card.Section>
            <Card.Section p="md">
                <Stack gap="md">
                    <ActionRow
                        title="Informed consent"
                        description="Review the terms you agreed to."
                        action={
                            <Button variant="light" color="blue" leftSection={<IconFileDescription size={16} />} onClick={handleViewConsent}>
                                View form
                            </Button>
                        }
                    />
                    <Divider />
                    <ActionRow
                        title="Withdraw consent"
                        description="Removes your consent and signs you out."
                        action={
                            <Button variant="light" color="red" leftSection={<IconShieldLock size={16} />} onClick={confirmWithdraw}>
                                Withdraw
                            </Button>
                        }
                    />
                </Stack>
            </Card.Section>
        </Card>
    );
}

// ── Danger Zone ───────────────────────────────────────────────────────────────

export function DangerSection() {
    const router = useRouter();
    const [deleting, setDeleting] = useState(false);
    const [, startRouting] = useTransition();

    async function handleWithdrawConsent() {
        localStorage.removeItem(CONSENT_KEY);
        await signOut();
        startRouting(() => { router.replace("/auth/login"); });
    }

    async function handleDeleteAccount() {
        const auth = getAuth(firebaseApp);
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        setDeleting(true);
        try {
            await deleteUser(currentUser);
            await fetch("/api/auth/session", { method: "DELETE" });
            startRouting(() => { router.replace("/auth/login"); });
        } catch {
            notifications.show({
                title: "Deletion failed",
                message: "Please sign out and sign back in, then try again.",
                color: "red",
            });
        } finally {
            setDeleting(false);
        }
    }

    function confirmDelete() {
        modals.openConfirmModal({
            title: "Delete your account?",
            children: (
                <Text size="sm">
                    This will permanently delete your account and all associated data. This action{" "}
                    <strong>cannot be undone</strong>.
                </Text>
            ),
            labels: { confirm: "Delete my account", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => void handleDeleteAccount(),
        });
    }

    return (
        <Card withBorder radius="lg" style={{ borderColor: "var(--mantine-color-red-4)" }}>
            <Card.Section withBorder style={{ background: "light-dark(var(--mantine-color-red-0), var(--mantine-color-dark-6))" }}>
                <Group gap="sm" align="center" p="md">
                    <ThemeIcon size={36} radius="md" variant="light" color="red">
                        <IconTrash size={20} />
                    </ThemeIcon>
                    <Text fw={600} size="md" c="red">Danger Zone</Text>
                </Group>
            </Card.Section>
            <Card.Section p="md">
                <Stack gap="md">
                    <ActionRow
                        title="Sign out"
                        description="Sign out of your account on this device."
                        action={
                            <Button variant="light" color="gray" leftSection={<IconLogout size={16} />} onClick={() => void handleWithdrawConsent()}>
                                Sign out
                            </Button>
                        }
                    />
                    <Divider />
                    <ActionRow
                        title="Delete my account"
                        description="Permanently deletes your account and all data."
                        action={
                            <Button variant="light" color="red" leftSection={<IconTrash size={16} />} loading={deleting} onClick={confirmDelete}>
                                Delete account
                            </Button>
                        }
                    />
                </Stack>
            </Card.Section>
        </Card>
    );
}
