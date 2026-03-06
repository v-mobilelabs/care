"use client";
import {
    ActionIcon,
    Avatar,
    Badge,
    Box,
    Button,
    Divider,
    Group,
    Loader,
    Paper,
    Skeleton,
    Stack,
    Tabs,
    Text,
    TextInput,
    Title,
    Tooltip,
} from "@mantine/core";
import {
    IconCheck,
    IconHeartbeat,
    IconSearch,
    IconUserOff,
    IconUserPlus,
    IconUserCheck,
    IconClockHour4,
    IconRefresh,
    IconUsers,
    IconAlertCircle,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DoctorPatientDto } from "@/data/doctor-patients";
import type { PatientSearchResultDto } from "@/data/doctor-patients";
import { colors } from "@/ui/tokens";

// ── Query keys ────────────────────────────────────────────────────────────────

const QUERY_KEY = ["doctor-patients"] as const;

// ── Fetchers ──────────────────────────────────────────────────────────────────

async function fetchPatients(): Promise<DoctorPatientDto[]> {
    const res = await fetch("/api/doctor-patients");
    if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(body.error?.message ?? "Failed to load patients");
    }
    return res.json() as Promise<DoctorPatientDto[]>;
}

async function searchPatients(q: string): Promise<PatientSearchResultDto[]> {
    if (!q.trim()) return [];
    const res = await fetch(`/api/patients/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(body.error?.message ?? "Search failed");
    }
    return res.json() as Promise<PatientSearchResultDto[]>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string | undefined | null): string {
    if (!name) return "?";
    return name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

// ── Search modal for adding a patient ─────────────────────────────────────────

function PatientSearchModal({ onInvite }: Readonly<{ onInvite: (patientId: string, name: string) => void }>) {
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");

    const { data: results, isFetching } = useQuery({
        queryKey: ["patient-search", debouncedQuery],
        queryFn: () => searchPatients(debouncedQuery),
        enabled: debouncedQuery.trim().length >= 2,
        staleTime: 30_000,
    });

    function handleInput(value: string) {
        setQuery(value);
        const timer = setTimeout(() => setDebouncedQuery(value), 400);
        return () => clearTimeout(timer);
    }

    return (
        <Stack gap="md">
            <TextInput
                placeholder="Search by patient name…"
                leftSection={<IconSearch size={16} />}
                rightSection={isFetching ? <Loader size={14} /> : null}
                value={query}
                onChange={(e) => handleInput(e.currentTarget.value)}
                autoFocus
            />

            {debouncedQuery.trim().length >= 2 && (
                <Stack gap="xs">
                    {results && results.length === 0 && (
                        <Text size="sm" c="dimmed" ta="center" py="md">
                            No patients found matching &ldquo;{debouncedQuery}&rdquo;
                        </Text>
                    )}
                    {results?.map((p) => (
                        <Paper
                            key={p.userId}
                            withBorder
                            radius="md"
                            p="sm"
                        >
                            <Group justify="space-between" wrap="nowrap">
                                <Group gap="sm" wrap="nowrap">
                                    <Avatar src={p.photoUrl ?? null} radius="xl" size="sm">
                                        {getInitials(p.name)}
                                    </Avatar>
                                    <Stack gap={0}>
                                        <Text size="sm" fw={500}>{p.name}</Text>
                                        {p.email && (
                                            <Text size="xs" c="dimmed">{p.email}</Text>
                                        )}
                                    </Stack>
                                </Group>
                                <Button
                                    size="xs"
                                    leftSection={<IconUserPlus size={14} />}
                                    onClick={() => onInvite(p.userId, p.name)}
                                >
                                    Invite
                                </Button>
                            </Group>
                        </Paper>
                    ))}
                </Stack>
            )}

            {debouncedQuery.trim().length < 2 && (
                <Text size="sm" c="dimmed" ta="center" py="md">
                    Type at least 2 characters to search.
                </Text>
            )}
        </Stack>
    );
}

// ── Patient row card ──────────────────────────────────────────────────────────

function PatientCard({
    patient,
    onRevoke,
    onReinvite,
}: Readonly<{
    patient: DoctorPatientDto;
    onRevoke: (p: DoctorPatientDto) => void;
    onReinvite: (p: DoctorPatientDto) => void;
}>) {
    const router = useRouter();
    const isAccepted = patient.status === "accepted";
    const isPending = patient.status === "pending";

    return (
        <Paper
            withBorder
            radius="lg"
            p="lg"
            style={{
                cursor: isAccepted ? "pointer" : undefined,
                transition: "box-shadow 150ms ease, border-color 150ms ease",
            }}
            onClick={isAccepted ? () => router.push(`/doctor/patients/${patient.patientId}`) : undefined}
        >
            <Group justify="space-between" wrap="nowrap">
                <Group gap="md" wrap="nowrap">
                    <Avatar
                        src={patient.patientPhotoUrl ?? null}
                        radius="xl"
                        size="md"
                        color="primary"
                    >
                        {getInitials(patient.patientName)}
                    </Avatar>
                    <Stack gap={2}>
                        <Group gap="xs" align="center">
                            <Text fw={600} size="sm">
                                {patient.patientName ?? "Unknown Patient"}
                            </Text>
                            <Badge
                                size="xs"
                                variant="light"
                                color={isAccepted ? colors.success : isPending ? "yellow" : "gray"}
                                leftSection={
                                    isAccepted
                                        ? <IconUserCheck size={10} />
                                        : isPending
                                            ? <IconClockHour4 size={10} />
                                            : <IconUserOff size={10} />
                                }
                            >
                                {isAccepted ? "Active" : isPending ? "Pending" : "Revoked"}
                            </Badge>
                        </Group>
                        {patient.patientEmail && (
                            <Text size="xs" c="dimmed">{patient.patientEmail}</Text>
                        )}
                        <Text size="xs" c="dimmed">
                            Invited {new Date(patient.invitedAt).toLocaleDateString()}
                            {patient.acceptedAt && ` · Accepted ${new Date(patient.acceptedAt).toLocaleDateString()}`}
                        </Text>
                    </Stack>
                </Group>

                <Group gap="xs" wrap="nowrap">
                    {isAccepted && (
                        <Tooltip label="View health records">
                            <ActionIcon
                                variant="light"
                                color="primary"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/doctor/patients/${patient.patientId}`);
                                }}
                                aria-label="View health records"
                            >
                                <IconHeartbeat size={16} />
                            </ActionIcon>
                        </Tooltip>
                    )}
                    {isPending && (
                        <Tooltip label="Re-send invite">
                            <ActionIcon
                                variant="light"
                                color="primary"
                                onClick={(e) => { e.stopPropagation(); onReinvite(patient); }}
                                aria-label="Reinvite"
                            >
                                <IconRefresh size={16} />
                            </ActionIcon>
                        </Tooltip>
                    )}
                    {(isAccepted || isPending) && (
                        <Tooltip label={isAccepted ? "Revoke access" : "Cancel invite"}>
                            <ActionIcon
                                variant="light"
                                color="red"
                                onClick={(e) => { e.stopPropagation(); onRevoke(patient); }}
                                aria-label="Revoke"
                            >
                                <IconUserOff size={16} />
                            </ActionIcon>
                        </Tooltip>
                    )}
                    {patient.status === "revoked" && (
                        <Tooltip label="Reinvite patient">
                            <ActionIcon
                                variant="light"
                                color="primary"
                                onClick={(e) => { e.stopPropagation(); onReinvite(patient); }}
                                aria-label="Reinvite"
                            >
                                <IconUserPlus size={16} />
                            </ActionIcon>
                        </Tooltip>
                    )}
                </Group>
            </Group>
        </Paper>
    );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ message }: Readonly<{ message: string }>) {
    return (
        <Box
            p="xl"
            ta="center"
            style={{
                borderRadius: "var(--mantine-radius-lg)",
                border: "1px dashed light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-5))",
                background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))",
            }}
        >
            <IconUsers size={32} color="var(--mantine-color-dimmed)" style={{ opacity: 0.5 }} />
            <Text c="dimmed" size="sm" mt="xs">{message}</Text>
        </Box>
    );
}

// ── Main content ──────────────────────────────────────────────────────────────

export function DoctorPatientsContent() {
    const queryClient = useQueryClient();

    const { data: patients, isLoading, error } = useQuery({
        queryKey: QUERY_KEY,
        queryFn: fetchPatients,
    });

    const inviteMutation = useMutation({
        mutationFn: async ({ patientId, source }: { patientId: string; source: "search" | "call" }) => {
            const res = await fetch("/api/doctor-patients", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ patientId, source }),
            });
            if (!res.ok) {
                const data = (await res.json()) as { error?: { message?: string } };
                throw new Error(data.error?.message ?? "Invite failed");
            }
            return res.json();
        },
        onSuccess: (_data, variables) => {
            notifications.show({
                title: "Invite sent",
                message: "The patient will receive an invite to connect.",
                color: colors.success,
                icon: <IconCheck size={18} />,
            });
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            modals.closeAll();
            // If invited from call, variables is available
            void variables;
        },
        onError: (err: Error) => {
            notifications.show({
                title: "Invite failed",
                message: err.message,
                color: colors.danger,
                icon: <IconAlertCircle size={18} />,
            });
        },
    });

    const revokeMutation = useMutation({
        mutationFn: async (patientId: string) => {
            const res = await fetch(`/api/doctor-patients/${patientId}`, { method: "DELETE" });
            if (!res.ok) {
                const data = (await res.json()) as { error?: { message?: string } };
                throw new Error(data.error?.message ?? "Failed to revoke");
            }
        },
        onSuccess: () => {
            notifications.show({
                title: "Access revoked",
                message: "Patient no longer has consent granted.",
                color: colors.success,
                icon: <IconCheck size={18} />,
            });
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
        onError: (err: Error) => {
            notifications.show({
                title: "Failed",
                message: err.message,
                color: colors.danger,
                icon: <IconAlertCircle size={18} />,
            });
        },
    });

    const reinviteMutation = useMutation({
        mutationFn: async (patientId: string) => {
            const res = await fetch(`/api/doctor-patients/${patientId}/reinvite`, { method: "POST" });
            if (!res.ok) {
                const data = (await res.json()) as { error?: { message?: string } };
                throw new Error(data.error?.message ?? "Reinvite failed");
            }
            return res.json();
        },
        onSuccess: () => {
            notifications.show({
                title: "Invite re-sent",
                message: "A new invite has been sent to the patient.",
                color: colors.success,
                icon: <IconCheck size={18} />,
            });
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        },
        onError: (err: Error) => {
            notifications.show({
                title: "Failed",
                message: err.message,
                color: colors.danger,
                icon: <IconAlertCircle size={18} />,
            });
        },
    });

    function openInviteModal() {
        modals.open({
            title: "Invite a patient",
            children: (
                <PatientSearchModal
                    onInvite={(patientId, name) => {
                        modals.openConfirmModal({
                            title: "Send invite?",
                            children: (
                                <Text size="sm">
                                    Send a consent invite to <strong>{name}</strong>? They will be notified
                                    and must accept before you can view their health records.
                                </Text>
                            ),
                            labels: { confirm: "Send invite", cancel: "Cancel" },
                            confirmProps: { color: "primary" },
                            onConfirm: () => inviteMutation.mutate({ patientId, source: "search" }),
                        });
                    }}
                />
            ),
        });
    }

    function confirmRevoke(patient: DoctorPatientDto) {
        modals.openConfirmModal({
            title: "Revoke access?",
            children: (
                <Text size="sm">
                    This will revoke your access to{" "}
                    <strong>{patient.patientName ?? "this patient"}&apos;s</strong> health records.
                    You can re-invite them later.
                </Text>
            ),
            labels: { confirm: "Revoke", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => revokeMutation.mutate(patient.patientId),
        });
    }

    function confirmReinvite(patient: DoctorPatientDto) {
        modals.openConfirmModal({
            title: "Re-send invite?",
            children: (
                <Text size="sm">
                    Send a new invite to <strong>{patient.patientName ?? "this patient"}</strong>?
                </Text>
            ),
            labels: { confirm: "Re-send", cancel: "Cancel" },
            confirmProps: { color: "primary" },
            onConfirm: () => reinviteMutation.mutate(patient.patientId),
        });
    }

    const accepted = patients?.filter((p) => p.status === "accepted") ?? [];
    const pending = patients?.filter((p) => p.status === "pending") ?? [];

    return (
        <Stack gap="lg">
            {/* Header */}
            <Group justify="space-between" align="flex-start">
                <Box>
                    <Title order={2}>My Patients</Title>
                    <Text c="dimmed" size="sm" mt={4}>
                        Manage patient consent and view health data for connected patients.
                    </Text>
                </Box>
                <Button
                    leftSection={<IconUserPlus size={16} />}
                    onClick={openInviteModal}
                >
                    Invite Patient
                </Button>
            </Group>

            {error && (
                <Paper withBorder radius="lg" p="lg" style={{ borderColor: "var(--mantine-color-red-4)" }}>
                    <Group gap="sm">
                        <IconAlertCircle size={18} color="var(--mantine-color-red-6)" />
                        <Text size="sm" c="red">Failed to load patients. Please refresh.</Text>
                    </Group>
                </Paper>
            )}

            {/* Tabs */}
            <Tabs defaultValue="active">
                <Tabs.List>
                    <Tabs.Tab
                        value="active"
                        leftSection={<IconUserCheck size={15} />}
                        rightSection={
                            !isLoading && accepted.length > 0 ? (
                                <Badge size="xs" color={colors.success} variant="filled" circle>
                                    {accepted.length}
                                </Badge>
                            ) : null
                        }
                    >
                        Active Patients
                    </Tabs.Tab>
                    <Tabs.Tab
                        value="pending"
                        leftSection={<IconClockHour4 size={15} />}
                        rightSection={
                            !isLoading && pending.length > 0 ? (
                                <Badge size="xs" color="yellow" variant="filled" circle>
                                    {pending.length}
                                </Badge>
                            ) : null
                        }
                    >
                        Pending Invites
                    </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="active" pt="md">
                    <Stack gap="sm">
                        {isLoading
                            ? Array.from({ length: 3 }).map((_, i) => (
                                <Paper key={i} withBorder radius="lg" p="lg">
                                    <Group gap="md">
                                        <Skeleton radius="xl" width={42} height={42} />
                                        <Stack gap={4} style={{ flex: 1 }}>
                                            <Skeleton height={14} width="40%" />
                                            <Skeleton height={12} width="25%" />
                                        </Stack>
                                    </Group>
                                </Paper>
                            ))
                            : accepted.length === 0
                                ? <EmptyState message="No active patients yet. Invite patients to get started." />
                                : accepted.map((p) => (
                                    <PatientCard
                                        key={p.patientId}
                                        patient={p}
                                        onRevoke={confirmRevoke}
                                        onReinvite={confirmReinvite}
                                    />
                                ))
                        }
                    </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="pending" pt="md">
                    <Stack gap="sm">
                        {isLoading
                            ? Array.from({ length: 2 }).map((_, i) => (
                                <Paper key={i} withBorder radius="lg" p="lg">
                                    <Group gap="md">
                                        <Skeleton radius="xl" width={42} height={42} />
                                        <Stack gap={4} style={{ flex: 1 }}>
                                            <Skeleton height={14} width="40%" />
                                            <Skeleton height={12} width="25%" />
                                        </Stack>
                                    </Group>
                                </Paper>
                            ))
                            : pending.length === 0
                                ? <EmptyState message="No pending invites. Invite a patient to connect." />
                                : pending.map((p) => (
                                    <PatientCard
                                        key={p.patientId}
                                        patient={p}
                                        onRevoke={confirmRevoke}
                                        onReinvite={confirmReinvite}
                                    />
                                ))
                        }
                    </Stack>
                </Tabs.Panel>
            </Tabs>

            <Divider />
            <Paper
                radius="lg"
                p="md"
                style={{
                    background: "light-dark(var(--mantine-color-primary-0), rgba(107,79,248,0.06))",
                    border: "1px solid light-dark(var(--mantine-color-primary-1), rgba(107,79,248,0.12))",
                }}
            >
                <Group gap="xs" align="flex-start">
                    <IconUserCheck size={16} color="var(--mantine-color-primary-5)" style={{ marginTop: 2 }} />
                    <Stack gap={2}>
                        <Text size="sm" fw={500}>Patient consent</Text>
                        <Text size="xs" c="dimmed">
                            Patients must accept your invite before you can view their health records, vitals, and history.
                            Invites can be revoked or re-sent at any time.
                        </Text>
                    </Stack>
                </Group>
            </Paper>
        </Stack>
    );
}
