"use client";
import {
    Avatar,
    Badge,
    Box,
    Button,
    Group,
    Modal,
    Paper,
    Skeleton,
    Stack,
    Text,
    ThemeIcon,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
    IconAlertCircle,
    IconCheck,
    IconShieldCheck,
    IconStethoscope,
    IconUserCheck,
    IconUserOff,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PatientInviteDto } from "@/data/doctor-patients";
import { chatKeys } from "@/app/(portal)/patient/_keys";
import { colors } from "@/ui/tokens";

function getInitials(name: string | undefined | null): string {
    if (!name) return "?";
    return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

// ── Single Invite Card ────────────────────────────────────────────────────────

function InviteCard({
    invite,
    onAccept,
    onDecline,
    isPending,
}: Readonly<{
    invite: PatientInviteDto;
    onAccept: (i: PatientInviteDto) => void;
    onDecline: (i: PatientInviteDto) => void;
    isPending: boolean;
}>) {
    return (
        <Paper withBorder radius="lg" p="md">
            <Group gap="md" wrap="nowrap" mb="sm">
                <Avatar src={invite.doctorPhotoUrl ?? null} radius="xl" size="lg" color="primary">
                    {getInitials(invite.doctorName)}
                </Avatar>
                <Stack gap={2}>
                    <Text fw={600} size="sm">{invite.doctorName ?? "Unknown Doctor"}</Text>
                    {invite.doctorSpecialty && (
                        <Group gap={4} align="center">
                            <IconStethoscope size={12} color="var(--mantine-color-dimmed)" />
                            <Text size="xs" c="dimmed">{invite.doctorSpecialty}</Text>
                        </Group>
                    )}
                    <Text size="xs" c="dimmed">
                        Invited {new Date(invite.invitedAt).toLocaleDateString()}
                    </Text>
                </Stack>
            </Group>

            <Box
                p="sm"
                mb="sm"
                style={{
                    borderRadius: "var(--mantine-radius-md)",
                    background: "light-dark(var(--mantine-color-yellow-0), rgba(255,200,0,0.06))",
                    border: "1px solid light-dark(var(--mantine-color-yellow-2), rgba(255,200,0,0.15))",
                }}
            >
                <Text size="xs">
                    By accepting, you consent to{" "}
                    <strong>{invite.doctorName ?? "this doctor"}</strong> viewing your
                    health records, vitals, medications, and clinical history.
                </Text>
            </Box>

            <Group gap="sm" justify="flex-end">
                <Button
                    variant="light"
                    color="red"
                    size="sm"
                    leftSection={<IconUserOff size={14} />}
                    onClick={() => onDecline(invite)}
                    disabled={isPending}
                >
                    Decline
                </Button>
                <Button
                    size="sm"
                    leftSection={<IconUserCheck size={14} />}
                    onClick={() => onAccept(invite)}
                    loading={isPending}
                >
                    Accept & Connect
                </Button>
            </Group>
        </Paper>
    );
}

// ── Invite Modal ──────────────────────────────────────────────────────────────

export function InviteModal({
    opened,
    onClose,
}: Readonly<{
    opened: boolean;
    onClose: () => void;
}>) {
    const queryClient = useQueryClient();

    const { data: invites = [], isLoading } = useQuery<PatientInviteDto[]>({
        queryKey: chatKeys.doctorInvites(),
        queryFn: async () => {
            const res = await fetch("/api/doctor-patients/invites");
            if (!res.ok) {
                const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
                throw new Error(body.error?.message ?? "Failed to load invites");
            }
            return res.json() as Promise<PatientInviteDto[]>;
        },
    });

    const respondMutation = useMutation({
        mutationFn: async ({ doctorId, action }: { doctorId: string; action: "accept" | "decline" }) => {
            const res = await fetch(`/api/doctor-patients/invites/${doctorId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });
            if (!res.ok) {
                const data = (await res.json()) as { error?: { message?: string } };
                throw new Error(data.error?.message ?? "Action failed");
            }
            return { doctorId, action };
        },
        onSuccess: ({ action }) => {
            notifications.show({
                title: action === "accept" ? "Connected!" : "Invite declined",
                message:
                    action === "accept"
                        ? "The doctor can now view your health records."
                        : "The invite has been declined.",
                color: action === "accept" ? colors.success : "gray",
                icon: action === "accept" ? <IconCheck size={18} /> : <IconUserOff size={18} />,
            });
            void queryClient.invalidateQueries({ queryKey: chatKeys.doctorInvites() });
        },
        onError: (err: Error) => {
            notifications.show({
                title: "Action failed",
                message: err.message,
                color: colors.danger,
                icon: <IconAlertCircle size={18} />,
            });
        },
    });

    function confirmAccept(invite: PatientInviteDto) {
        modals.openConfirmModal({
            title: "Grant access?",
            children: (
                <Text size="sm">
                    Allow <strong>{invite.doctorName ?? "this doctor"}</strong> to view your health
                    records, vitals, medications, and history? You can revoke this at any time.
                </Text>
            ),
            labels: { confirm: "Accept & Connect", cancel: "Cancel" },
            confirmProps: { color: "primary" },
            onConfirm: () => respondMutation.mutate({ doctorId: invite.doctorId, action: "accept" }),
        });
    }

    function confirmDecline(invite: PatientInviteDto) {
        modals.openConfirmModal({
            title: "Decline invite?",
            children: (
                <Text size="sm">
                    Decline the invite from <strong>{invite.doctorName ?? "this doctor"}</strong>?
                    They can send you another invite later.
                </Text>
            ),
            labels: { confirm: "Decline", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => respondMutation.mutate({ doctorId: invite.doctorId, action: "decline" }),
        });
    }

    const pendingInvites = invites.filter((i) => i.status === "pending");

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group gap="sm">
                    <ThemeIcon size={28} radius="md" color="primary" variant="light">
                        <IconUserCheck size={16} />
                    </ThemeIcon>
                    <Text fw={600} size="sm">Doctor Invites</Text>
                </Group>
            }
            size="md"
            radius="lg"
        >
            <Stack gap="sm">
                {isLoading && (
                    <>
                        <Skeleton height={170} radius="lg" />
                        <Skeleton height={170} radius="lg" />
                    </>
                )}

                {!isLoading && pendingInvites.length === 0 && (
                    <Box py={60} style={{ textAlign: "center" }}>
                        <ThemeIcon
                            size={56}
                            radius="xl"
                            color="primary"
                            variant="light"
                            mx="auto"
                            mb="md"
                        >
                            <IconUserCheck size={28} />
                        </ThemeIcon>
                        <Text fw={600} size="sm" mb={6}>No pending invites</Text>
                        <Text size="sm" c="dimmed" maw={280} mx="auto" lh={1.6}>
                            Doctors can invite you to connect. Pending invites will appear here.
                        </Text>
                    </Box>
                )}

                {!isLoading && pendingInvites.length > 0 && (
                    <>
                        <Text size="xs" fw={600} tt="uppercase" c="dimmed">
                            Awaiting your response ({pendingInvites.length})
                        </Text>
                        {pendingInvites.map((invite) => (
                            <InviteCard
                                key={invite.doctorId}
                                invite={invite}
                                onAccept={confirmAccept}
                                onDecline={confirmDecline}
                                isPending={
                                    respondMutation.isPending &&
                                    respondMutation.variables?.doctorId === invite.doctorId
                                }
                            />
                        ))}
                        <Paper
                            radius="lg"
                            p="md"
                            style={{
                                background: "light-dark(var(--mantine-color-primary-0), rgba(107,79,248,0.06))",
                                border: "1px solid light-dark(var(--mantine-color-primary-1), rgba(107,79,248,0.12))",
                            }}
                        >
                            <Group gap="xs" align="flex-start">
                                <IconShieldCheck
                                    size={15}
                                    color="var(--mantine-color-primary-5)"
                                    style={{ marginTop: 1 }}
                                />
                                <Stack gap={2}>
                                    <Text size="xs" fw={500}>Your privacy is protected</Text>
                                    <Text size="xs" c="dimmed">
                                        Only doctors you accept can view your health data. Invites
                                        from video calls are auto-accepted since you participated.
                                    </Text>
                                </Stack>
                            </Group>
                        </Paper>
                    </>
                )}
            </Stack>
        </Modal>
    );
}
