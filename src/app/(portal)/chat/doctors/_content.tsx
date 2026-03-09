"use client";
import {
    ActionIcon,
    Avatar,
    Badge,
    Box,
    Button,
    Divider,
    Group,
    Paper,
    ScrollArea,
    Skeleton,
    Stack,
    Tabs,
    Text,
    ThemeIcon,
    Title,
    Tooltip,
} from "@mantine/core";

import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
    IconBuildingHospital,
    IconCheck,
    IconClock,
    IconMapPin,
    IconMessageCircle,
    IconPhone,
    IconShieldCheck,
    IconShieldOff,
    IconStar,
    IconStethoscope,
    IconTrash,
    IconUserCheck,
    IconUserOff,
    IconWorld,
    IconAlertCircle,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
    useDoctorsQuery,
    useDeleteDoctorMutation,
    type DoctorRecord,
} from "@/app/(portal)/chat/_query";
import { chatKeys } from "@/app/(portal)/chat/_keys";
import type { PatientInviteDto } from "@/data/doctor-patients";
import { useOnlineCount } from "@/lib/presence/use-online-count";
import { colors } from "@/ui/tokens";
import { useAuth } from "@/ui/providers/auth-provider";
import { useMessaging } from "@/ui/providers/messaging-provider";
import { startConversation } from "@/lib/messaging/actions";

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

// ── Doctor card ──────────────────────────────────────────────────────────────────

function DoctorCard({ doctor, onDelete }: Readonly<{ doctor: DoctorRecord; onDelete: () => void }>) {
    const [hovered, setHovered] = useState(false);
    const { clinic } = doctor;

    return (
        <Paper
            withBorder
            radius="lg"
            p="lg"
            style={{
                transition: "box-shadow 200ms ease",
                boxShadow: hovered ? "0 4px 20px rgba(0,0,0,0.1)" : undefined,
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <Group justify="space-between" wrap="nowrap" mb={clinic ? "sm" : 0}>
                <Group gap="sm" wrap="nowrap">
                    <ThemeIcon size={40} radius="md" color="primary" variant="light">
                        <IconStethoscope size={20} />
                    </ThemeIcon>
                    <Box style={{ minWidth: 0 }}>
                        <Text fw={700} size="sm" style={{ lineHeight: 1.3 }}>
                            {doctor.name}
                        </Text>
                        <Badge size="xs" variant="light" color="primary" mt={2}>
                            {doctor.specialty}
                        </Badge>
                    </Box>
                </Group>
                <Tooltip label="Remove doctor">
                    <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={onDelete}
                        aria-label="Delete doctor"
                    >
                        <IconTrash size={14} />
                    </ActionIcon>
                </Tooltip>
            </Group>

            {/* Address */}
            <Group gap={6} mt="xs">
                <IconMapPin size={13} color="var(--mantine-color-dimmed)" />
                <Text size="xs" c="dimmed">{doctor.address}</Text>
            </Group>

            {clinic && (
                <>
                    <Divider my="sm" />
                    <Stack gap={6}>
                        <Group gap={6}>
                            <IconBuildingHospital size={13} color="var(--mantine-color-dimmed)" />
                            <Text size="xs" fw={600}>{clinic.name}</Text>
                        </Group>
                        {clinic.address && clinic.address !== doctor.address && (
                            <Group gap={6}>
                                <IconMapPin size={13} color="var(--mantine-color-dimmed)" />
                                <Text size="xs" c="dimmed">{clinic.address}</Text>
                            </Group>
                        )}
                        {clinic.phone && (
                            <Group gap={6}>
                                <IconPhone size={13} color="var(--mantine-color-dimmed)" />
                                <Text size="xs" c="dimmed">{clinic.phone}</Text>
                            </Group>
                        )}
                        {clinic.website && (
                            <Group gap={6}>
                                <IconWorld size={13} color="var(--mantine-color-dimmed)" />
                                <Text
                                    size="xs"
                                    c="blue"
                                    component="a"
                                    href={clinic.website.startsWith("http") ? clinic.website : `https://${clinic.website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ wordBreak: "break-all" }}
                                >
                                    {clinic.website}
                                </Text>
                            </Group>
                        )}
                        {clinic.hours && (
                            <Group gap={6}>
                                <IconClock size={13} color="var(--mantine-color-dimmed)" />
                                <Text size="xs" c="dimmed">{clinic.hours}</Text>
                            </Group>
                        )}
                        {clinic.rating && (
                            <Group gap={6}>
                                <IconStar size={13} color="var(--mantine-color-yellow-5)" />
                                <Text size="xs" c="dimmed">{clinic.rating.toFixed(1)} / 5.0</Text>
                            </Group>
                        )}
                    </Stack>
                </>
            )}

            {doctor.notes && (
                <Text size="xs" c="dimmed" mt="xs" fs="italic">
                    {doctor.notes}
                </Text>
            )}

            <Text size="10px" c="dimmed" mt="sm">
                Added {formatDate(doctor.createdAt)}
            </Text>
        </Paper>
    );
}


// ── Doctor invites helpers ────────────────────────────────────────────────────

function getInitials(name: string | undefined | null): string {
    if (!name) return "?";
    return name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

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
    const isAccepted = invite.status === "accepted";

    return (
        <Paper withBorder radius="lg" p="lg">
            <Stack gap="md">
                <Group justify="space-between" wrap="nowrap">
                    <Group gap="md" wrap="nowrap">
                        <Avatar src={invite.doctorPhotoUrl ?? null} radius="xl" size="lg" color="primary">
                            {getInitials(invite.doctorName)}
                        </Avatar>
                        <Stack gap={2}>
                            <Group gap="xs" align="center">
                                <Text fw={600} size="sm">{invite.doctorName ?? "Unknown Doctor"}</Text>
                                <Badge
                                    size="xs"
                                    variant="light"
                                    color={isAccepted ? colors.success : "yellow"}
                                >
                                    {isAccepted ? "Connected" : "Awaiting response"}
                                </Badge>
                            </Group>
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
                </Group>

                {!isAccepted && (
                    <>
                        <Divider />
                        <Box
                            p="sm"
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
                    </>
                )}

                {isAccepted && (
                    <Group gap="xs">
                        <IconShieldCheck size={14} color={`var(--mantine-color-${colors.success}-6)`} />
                        <Text size="xs" c={colors.success}>
                            This doctor can view your health records.
                        </Text>
                    </Group>
                )}
            </Stack>
        </Paper>
    );
}

// ── Connected doctor card (accepted invite) ─────────────────────────────────

function ConnectedDoctorCard({
    invite,
    onRevoke,
}: Readonly<{ invite: PatientInviteDto; onRevoke: (i: PatientInviteDto) => void }>) {
    const { user } = useAuth();
    const { openConversation } = useMessaging();

    async function handleMessage() {
        if (!user) return;
        const convId = await startConversation({
            doctorId: invite.doctorId,
            patientId: user.uid,
            doctorName: invite.doctorName ?? "Doctor",
            patientName: user.displayName ?? "Patient",
        });
        openConversation(convId);
    }

    return (
        <Paper withBorder radius="lg" p="lg">
            <Group justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap">
                    <Avatar src={invite.doctorPhotoUrl ?? null} radius="xl" size={40} color="primary">
                        {getInitials(invite.doctorName)}
                    </Avatar>
                    <Box style={{ minWidth: 0 }}>
                        <Group gap="xs" align="center" wrap="nowrap">
                            <Text fw={700} size="sm" style={{ lineHeight: 1.3 }}>
                                {invite.doctorName ?? "Unknown Doctor"}
                            </Text>
                            <Badge size="xs" variant="light" color={colors.success}>
                                Connected
                            </Badge>
                        </Group>
                        {invite.doctorSpecialty && (
                            <Group gap={4} mt={2}>
                                <IconStethoscope size={12} color="var(--mantine-color-dimmed)" />
                                <Text size="xs" c="dimmed">{invite.doctorSpecialty}</Text>
                            </Group>
                        )}
                        <Group gap={4} mt={2}>
                            <IconShieldCheck size={12} color={`var(--mantine-color-${colors.success}-6)`} />
                            <Text size="xs" c={colors.success}>Can view your health records</Text>
                        </Group>
                    </Box>
                </Group>
                <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
                    <Text size="10px" c="dimmed">
                        Connected {new Date(invite.updatedAt).toLocaleDateString()}
                    </Text>
                    <Tooltip label="Message doctor">
                        <ActionIcon
                            variant="light"
                            color="primary"
                            size="sm"
                            onClick={() => void handleMessage()}
                            aria-label="Message doctor"
                        >
                            <IconMessageCircle size={14} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Revoke access">
                        <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            onClick={() => onRevoke(invite)}
                            aria-label="Revoke access"
                        >
                            <IconShieldOff size={14} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>
        </Paper>
    );
}

// ── Main content ──────────────────────────────────────────────────────────────

export function DoctorsContent() {
    const queryClient = useQueryClient();
    const { data: doctors = [], isLoading: doctorsLoading } = useDoctorsQuery();
    const deleteDoctor = useDeleteDoctorMutation();

    // ── Invites query ─────────────────────────────────────────────────────────
    const { data: invites = [], isLoading: invitesLoading } = useQuery<PatientInviteDto[]>({
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

    const revokeMutation = useMutation({
        mutationFn: async (doctorId: string) => {
            const res = await fetch(`/api/doctor-patients/invites/${doctorId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "decline" }),
            });
            if (!res.ok) {
                const data = (await res.json()) as { error?: { message?: string } };
                throw new Error(data.error?.message ?? "Failed to revoke");
            }
        },
        onSuccess: () => {
            notifications.show({
                title: "Access revoked",
                message: "The doctor can no longer view your health records.",
                color: colors.success,
                icon: <IconCheck size={18} />,
            });
            void queryClient.invalidateQueries({ queryKey: chatKeys.doctorInvites() });
        },
        onError: (err: Error) => {
            notifications.show({
                title: "Failed to revoke",
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
                    records, vitals, medications, and history? You can decline this at any time.
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

    function doctorCountLabel() {
        if (doctors.length === 0) return "Manage your healthcare providers";
        const plural = doctors.length === 1 ? "" : "s";
        return `${doctors.length} healthcare provider${plural}`;
    }

    function handleDelete(doctor: DoctorRecord) {
        modals.openConfirmModal({
            title: "Remove doctor?",
            children: (
                <Text size="sm">
                    This will remove <strong>{doctor.name}</strong> from your doctors list. This cannot be undone.
                </Text>
            ),
            labels: { confirm: "Remove", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => {
                deleteDoctor.mutate(doctor.id, {
                    onSuccess: () => {
                        notifications.show({
                            title: "Doctor removed",
                            message: `${doctor.name} has been removed.`,
                            color: colors.success,
                            icon: <IconCheck size={18} />,
                        });
                    },
                    onError: (err) => {
                        notifications.show({
                            title: "Failed to remove",
                            message: err instanceof Error ? err.message : "Something went wrong.",
                            color: colors.danger,
                        });
                    },
                });
            },
        });
    }

    function confirmRevoke(invite: PatientInviteDto) {
        modals.openConfirmModal({
            title: "Revoke access?",
            children: (
                <Text size="sm">
                    Remove <strong>{invite.doctorName ?? "this doctor"}</strong>&apos;s access to your
                    health records? They will no longer be able to view your data.
                    They can re-invite you later.
                </Text>
            ),
            labels: { confirm: "Revoke access", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => revokeMutation.mutate(invite.doctorId),
        });
    }

    const pendingInvites = invites.filter((i) => i.status === "pending");
    const connectedInvites = invites.filter((i) => i.status === "accepted");

    // Gather UIDs of platform-connected doctors (accepted invites)
    const connectedDoctorUids = connectedInvites.map((i) => i.doctorId);
    const onlineCount = useOnlineCount(connectedDoctorUids);

    return (
        <Box style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

            {/* ── Title bar ── */}
            <Box
                px={{ base: "md", sm: "xl" }}
                pt="md"
                pb="xs"
                style={{
                    flexShrink: 0,
                    borderBottom: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                    background: "light-dark(white, var(--mantine-color-dark-8))",
                }}
            >
                <Group gap="sm" align="center" wrap="nowrap" mb="sm">
                    <Group gap="sm">
                        <ThemeIcon size={36} radius="md" color="primary" variant="light">
                            <IconStethoscope size={20} />
                        </ThemeIcon>
                        <Box>
                            <Title order={4} lh={1.2}>My Doctors</Title>
                            <Group gap="xs" align="center">
                                <Text size="xs" c="dimmed">{doctorCountLabel()}</Text>
                                {onlineCount > 0 && (
                                    <Badge
                                        size="xs"
                                        variant="dot"
                                        color={colors.success}
                                    >
                                        {onlineCount} online
                                    </Badge>
                                )}
                            </Group>
                        </Box>
                    </Group>
                </Group>
            </Box>

            {/* ── Tabs ── */}
            <Box style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                <Tabs
                    defaultValue="contacts"
                    keepMounted={false}
                    style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
                >
                    {/* Tab list row */}
                    <Box
                        px={{ base: "md", sm: "xl" }}
                        style={{
                            flexShrink: 0,
                            borderBottom: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                            background: "light-dark(white, var(--mantine-color-dark-8))",
                        }}
                    >
                        <Tabs.List>
                            <Tabs.Tab value="contacts" leftSection={<IconStethoscope size={14} />}>
                                Doctors
                            </Tabs.Tab>
                            <Tabs.Tab
                                value="invites"
                                leftSection={<IconUserCheck size={14} />}
                                rightSection={
                                    pendingInvites.length > 0 ? (
                                        <Badge size="xs" color="yellow" variant="filled" circle>
                                            {pendingInvites.length}
                                        </Badge>
                                    ) : null
                                }
                            >
                                Invites
                            </Tabs.Tab>
                        </Tabs.List>
                    </Box>

                    {/* ── Contacts panel ── */}
                    <Tabs.Panel value="contacts" style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                        <ScrollArea style={{ height: "100%" }}>
                            <Box px={{ base: "md", sm: "xl" }} py="lg" maw={800} mx="auto">
                                {doctorsLoading && (
                                    <Stack gap="md">
                                        {["a", "b", "c"].map((k) => (
                                            <Skeleton key={k} height={130} radius="lg" />
                                        ))}
                                    </Stack>
                                )}

                                {!doctorsLoading && doctors.length === 0 && connectedInvites.length === 0 && (
                                    <Box py={80} style={{ textAlign: "center" }}>
                                        <ThemeIcon size={64} radius="xl" color="primary" variant="light" mx="auto" mb="md">
                                            <IconStethoscope size={32} />
                                        </ThemeIcon>
                                        <Text fw={600} size="sm" mb={6}>No doctors yet</Text>
                                        <Text size="sm" c="dimmed" maw={300} mx="auto" lh={1.6}>
                                            Your healthcare providers will appear here once a doctor connects with you.
                                        </Text>
                                    </Box>
                                )}

                                {!doctorsLoading && doctors.length > 0 && (
                                    <Stack gap="md">
                                        {doctors.map((doctor) => (
                                            <DoctorCard
                                                key={doctor.id}
                                                doctor={doctor}
                                                onDelete={() => handleDelete(doctor)}
                                            />
                                        ))}
                                    </Stack>
                                )}

                                {!doctorsLoading && connectedInvites.length > 0 && (
                                    <Stack gap="md" mt={doctors.length > 0 ? "md" : 0}>
                                        {doctors.length > 0 && (
                                            <Group gap={6} mt={4}>
                                                <Divider style={{ flex: 1 }} />
                                                <Text size="xs" c="dimmed" fw={500}>Connected via invite</Text>
                                                <Divider style={{ flex: 1 }} />
                                            </Group>
                                        )}
                                        {connectedInvites.map((invite) => (
                                            <ConnectedDoctorCard
                                                key={invite.doctorId}
                                                invite={invite}
                                                onRevoke={confirmRevoke}
                                            />
                                        ))}
                                    </Stack>
                                )}
                            </Box>
                        </ScrollArea>
                    </Tabs.Panel>

                    {/* ── Invites panel ── */}
                    <Tabs.Panel value="invites" style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                        <ScrollArea style={{ height: "100%" }}>
                            <Box px={{ base: "md", sm: "xl" }} py="lg" maw={800} mx="auto">
                                <Stack gap="sm">
                                    {invitesLoading && (
                                        <>
                                            <Skeleton height={180} radius="lg" />
                                            <Skeleton height={110} radius="lg" />
                                        </>
                                    )}

                                    {!invitesLoading && pendingInvites.length > 0 && (
                                        <Stack gap="sm">
                                            <Text size="xs" fw={600} tt="uppercase" c="dimmed" px={2}>
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
                                        </Stack>
                                    )}

                                    {!invitesLoading && pendingInvites.length === 0 && (
                                        <Box py={80} style={{ textAlign: "center" }}>
                                            <ThemeIcon size={64} radius="xl" color="primary" variant="light" mx="auto" mb="md">
                                                <IconUserCheck size={32} />
                                            </ThemeIcon>
                                            <Text fw={600} size="sm" mb={6}>No invites yet</Text>
                                            <Text size="sm" c="dimmed" maw={300} mx="auto" lh={1.6}>
                                                Doctors can invite you to connect via name search or after a video call.
                                                You&apos;ll see pending invites here to accept or decline.
                                            </Text>
                                        </Box>
                                    )}

                                    {!invitesLoading && pendingInvites.length > 0 && (
                                        <Paper
                                            radius="lg"
                                            p="md"
                                            mt="sm"
                                            style={{
                                                background: "light-dark(var(--mantine-color-primary-0), rgba(107,79,248,0.06))",
                                                border: "1px solid light-dark(var(--mantine-color-primary-1), rgba(107,79,248,0.12))",
                                            }}
                                        >
                                            <Group gap="xs" align="flex-start">
                                                <IconShieldCheck size={15} color="var(--mantine-color-primary-5)" style={{ marginTop: 1 }} />
                                                <Stack gap={2}>
                                                    <Text size="xs" fw={500}>Your privacy is protected</Text>
                                                    <Text size="xs" c="dimmed">
                                                        Only doctors you accept can view your health data. Invites from video calls
                                                        are auto-accepted since you participated in the call.
                                                    </Text>
                                                </Stack>
                                            </Group>
                                        </Paper>
                                    )}
                                </Stack>
                            </Box>
                        </ScrollArea>
                    </Tabs.Panel>
                </Tabs>
            </Box>
        </Box>
    );
}
