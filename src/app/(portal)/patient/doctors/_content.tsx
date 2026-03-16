"use client";
import {
    Badge,
    Box,
    Button,
    Card,
    Container,
    Divider,
    Group,
    ScrollArea,
    Skeleton,
    Stack,
    Text,
    ThemeIcon,
    Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
    IconAlertCircle,
    IconCheck,
    IconStethoscope,
    IconUserCheck,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
    useDoctorsQuery,
    useDeleteDoctorMutation,
    type DoctorRecord,
} from "@/app/(portal)/patient/_query";
import { chatKeys } from "@/app/(portal)/patient/_keys";
import type { PatientInviteDto } from "@/data/doctor-patients";
import { useOnlineCount } from "@/lib/presence/use-online-count";
import { colors } from "@/ui/tokens";
import InviteModal from "./_modal";
import { Invites } from "./invites";
import { ConnectedDoctorCard } from "./connected-doctor-card";
import { DoctorCard } from "./doctor-card";

// ── RenderContent Component ───────────────────────────────────────────────────

function RenderContent({
    invites,
    doctors,
    doctorsLoading,
    handleDelete,
    confirmRevoke,
    inviteModalOpen,
    setInviteModalOpen,
}: Readonly<{
    invites: PatientInviteDto[];
    doctors: DoctorRecord[];
    doctorsLoading: boolean;
    handleDelete: (doctor: DoctorRecord) => void;
    confirmRevoke: (invite: PatientInviteDto) => void;
    inviteModalOpen: boolean;
    setInviteModalOpen: (open: boolean) => void;
}>) {
    const pendingInvites = invites.filter((i) => i.status === "pending");
    const connectedInvites = invites.filter((i) => i.status === "accepted");
    const connectedDoctorUids = connectedInvites.map((i) => i.doctorId);
    const onlineCount = useOnlineCount(connectedDoctorUids);
    const totalCount = doctors.length + connectedInvites.length;
    function doctorCountLabel() {
        if (totalCount === 0) return "Manage your healthcare providers";
        const plural = totalCount === 1 ? "" : "s";
        return `${totalCount} healthcare provider${plural}`;
    }
    return (
        <>
            <Card radius="xl" withBorder padding={0}>
                {/* ── Header ── */}
                <Card.Section
                    withBorder
                    inheritPadding
                    px="md"
                    py="md"
                    bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))"
                >
                    <Group justify="space-between" align="center">
                        <Group gap="sm">
                            <ThemeIcon size={36} radius="md" color="primary" variant="light">
                                <IconStethoscope size={20} />
                            </ThemeIcon>
                            <Box>
                                <Title order={4} lh={1.2}>My Doctors</Title>
                                <Group gap="xs" align="center">
                                    <Text size="xs" c="dimmed">{doctorCountLabel()}</Text>
                                    {onlineCount > 0 && (
                                        <Badge size="xs" variant="dot" color={colors.success}>
                                            {onlineCount} online
                                        </Badge>
                                    )}
                                </Group>
                            </Box>
                        </Group>
                        <Button
                            variant="light"
                            size="sm"
                            leftSection={<IconUserCheck size={16} />}
                            rightSection={
                                pendingInvites.length > 0 ? (
                                    <Badge size="xs" color="yellow" variant="filled" circle>
                                        {pendingInvites.length}
                                    </Badge>
                                ) : null
                            }
                            onClick={() => setInviteModalOpen(true)}
                        >
                            Invites
                        </Button>
                    </Group>
                </Card.Section>
                {/* ── Doctors list ── */}
                <Card.Section style={{ flex: 1, overflow: "hidden" }}>
                    <ScrollArea style={{ height: "100%" }}>
                        <Box px={{ base: "md", sm: "xl" }} py="lg" maw={800} mx="auto">
                            {doctorsLoading && (
                                <Stack gap="md">
                                    {["a", "b", "c"].map((k) => (
                                        <Skeleton key={k} height={120} radius="lg" />
                                    ))}
                                </Stack>
                            )}
                            {!doctorsLoading && totalCount === 0 && (
                                <Box py={80} style={{ textAlign: "center" }}>
                                    <ThemeIcon
                                        size={64}
                                        radius="xl"
                                        color="primary"
                                        variant="light"
                                        mx="auto"
                                        mb="md"
                                    >
                                        <IconStethoscope size={32} />
                                    </ThemeIcon>
                                    <Text fw={600} size="sm" mb={6}>No doctors yet</Text>
                                    <Text size="sm" c="dimmed" maw={300} mx="auto" lh={1.6}>
                                        Your healthcare providers will appear here once a doctor
                                        connects with you or invites you to share your records.
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
                                            <Text size="xs" c="dimmed" fw={500}>
                                                Connected via invite
                                            </Text>
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
                </Card.Section>
            </Card>
            <InviteModal
                opened={inviteModalOpen}
                onClose={() => setInviteModalOpen(false)}
            />
        </>
    );
}

// ── Main Content ──────────────────────────────────────────────────────────────

export function DoctorsContent() {
    const queryClient = useQueryClient();
    const [inviteModalOpen, setInviteModalOpen] = useState(false);

    const { data: doctors = [], isLoading: doctorsLoading } = useDoctorsQuery();
    const deleteDoctor = useDeleteDoctorMutation();


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
            queryClient.invalidateQueries({ queryKey: chatKeys.doctorInvites() });
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

    function handleDelete(doctor: DoctorRecord) {
        modals.openConfirmModal({
            title: "Remove doctor?",
            children: (
                <Text size="sm">
                    This will remove <strong>{doctor.name}</strong> from your doctors list.
                    This cannot be undone.
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
                    Remove <strong>{invite.doctorName ?? "this doctor"}</strong>&apos;s access to
                    your health records? They will no longer be able to view your data.
                </Text>
            ),
            labels: { confirm: "Revoke access", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => revokeMutation.mutate(invite.doctorId),
        });
    }




    return (
        <Container pt="md">
            <Invites
                render={(invites) => (
                    <RenderContent
                        invites={invites}
                        doctors={doctors}
                        doctorsLoading={doctorsLoading}
                        handleDelete={handleDelete}
                        confirmRevoke={confirmRevoke}
                        inviteModalOpen={inviteModalOpen}
                        setInviteModalOpen={setInviteModalOpen}
                    />
                )}
            />
        </Container>
    );
}
