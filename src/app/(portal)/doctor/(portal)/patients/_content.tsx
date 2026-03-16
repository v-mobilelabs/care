"use client";
import {
    ActionIcon,
    Avatar,
    Badge,
    Box,
    Button,
    Group,
    Loader,
    Skeleton,
    Stack,
    Tabs,
    Text,
    TextInput,
    Tooltip,
} from "@mantine/core";
import {
    IconCheck,
    IconChevronRight,
    IconHeartbeat,
    IconMessageCircle,
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
import { useState } from "react";
import Link from "next/link";
import { useLinkStatus } from "next/link";
import type { DoctorPatientDto } from "@/data/doctor-patients";
import type { PatientSearchResultDto } from "@/data/doctor-patients";
import { colors } from "@/ui/tokens";
import { useAuth } from "@/ui/providers/auth-provider";
import { useMessaging } from "@/ui/providers/messaging-provider";
import { startConversation } from "@/lib/messaging/actions";
import {
    iosCard,
    iosGroupedCard,
    iosRow,
    iosRowLast,
    iosLargeTitle,
    iosSubtitle,
    ios,
    allKeyframes,
} from "@/ui/ios";

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
                radius={12}
                styles={{
                    input: {
                        border: "0.5px solid light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.1))",
                    },
                }}
            />

            {debouncedQuery.trim().length >= 2 && (
                <Box style={iosGroupedCard}>
                    {results && results.length === 0 && (
                        <Text size="sm" c="dimmed" ta="center" p="lg">
                            No patients found matching &ldquo;{debouncedQuery}&rdquo;
                        </Text>
                    )}
                    {results?.map((p, i) => (
                        <Box
                            key={p.userId}
                            style={i === (results.length - 1) ? iosRowLast : iosRow}
                            px="md"
                            py="sm"
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
                                    radius="xl"
                                    leftSection={<IconUserPlus size={14} />}
                                    onClick={() => onInvite(p.userId, p.name)}
                                    style={{ fontWeight: 600 }}
                                >
                                    Invite
                                </Button>
                            </Group>
                        </Box>
                    ))}
                </Box>
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

function PatientCardContent({ patient, onRevoke, onReinvite }: Readonly<{
    patient: DoctorPatientDto;
    onRevoke: (p: DoctorPatientDto) => void;
    onReinvite: (p: DoctorPatientDto) => void;
}>) {
    const { pending } = useLinkStatus();
    const { user } = useAuth();
    const { openConversation } = useMessaging();
    const isAccepted = patient.status === "accepted";
    const isPending = patient.status === "pending";

    async function handleMessage(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (!user) return;
        const convId = await startConversation({
            doctorId: user.uid,
            patientId: patient.patientId,
            doctorName: user.displayName ?? "Doctor",
            patientName: patient.patientName ?? "Patient",
        });
        openConversation(convId);
    }

    return (
        <Box
            style={{
                ...iosCard,
                padding: "14px 16px",
                cursor: isAccepted ? "pointer" : undefined,
                transition: ios.transition.fast,
                opacity: pending ? 0.7 : 1,
            }}
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
                                radius="xl"
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
                        <Tooltip label="Message patient">
                            <ActionIcon
                                variant="light"
                                color="primary"
                                radius="xl"
                                onClick={(e) => void handleMessage(e)}
                                aria-label="Message patient"
                            >
                                <IconMessageCircle size={16} />
                            </ActionIcon>
                        </Tooltip>
                    )}
                    {isAccepted && (
                        <Tooltip label="View health records">
                            <ActionIcon
                                component={Link}
                                href={`/doctor/patients/${patient.patientId}`}
                                variant="light"
                                color="primary"
                                radius="xl"
                                aria-label="View health records"
                                onClick={(e: React.MouseEvent) => e.stopPropagation()}
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
                                radius="xl"
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
                                radius="xl"
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
                                radius="xl"
                                onClick={(e) => { e.stopPropagation(); onReinvite(patient); }}
                                aria-label="Reinvite"
                            >
                                <IconUserPlus size={16} />
                            </ActionIcon>
                        </Tooltip>
                    )}
                    {isAccepted && (
                        <IconChevronRight size={16} color="var(--mantine-color-dimmed)" style={{ opacity: 0.5 }} />
                    )}
                </Group>
            </Group>
        </Box>
    );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function PatientCard(props: Readonly<{
    patient: DoctorPatientDto;
    onRevoke: (p: DoctorPatientDto) => void;
    onReinvite: (p: DoctorPatientDto) => void;
}>) {
    const isAccepted = props.patient.status === "accepted";
    if (isAccepted) {
        return (
            <Link href={`/doctor/patients/${props.patient.patientId}`} style={{ textDecoration: "none", display: "block", color: "inherit" }}>
                <PatientCardContent {...props} />
            </Link>
        );
    }
    return <PatientCardContent {...props} />;
}

function EmptyState({ message }: Readonly<{ message: string }>) {
    return (
        <Box p="xl" ta="center">
            <Box
                style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: "light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.06))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 12px",
                    animation: ios.animation.float,
                }}
            >
                <IconUsers size={26} color="var(--mantine-color-dimmed)" />
            </Box>
            <Text c="dimmed" size="sm">{message}</Text>
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
        onMutate: async ({ patientId, source }) => {
            await queryClient.cancelQueries({ queryKey: QUERY_KEY });
            const snapshot = queryClient.getQueryData<DoctorPatientDto[]>(QUERY_KEY);
            const optimistic: DoctorPatientDto = {
                doctorId: "",
                patientId,
                status: "pending",
                source,
                invitedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            queryClient.setQueryData<DoctorPatientDto[]>(QUERY_KEY, (old = []) => [...old, optimistic]);
            return { snapshot };
        },
        onSuccess: (_data, _variables) => {
            notifications.show({
                title: "Invite sent",
                message: "The patient will receive an invite to connect.",
                color: colors.success,
                icon: <IconCheck size={18} />,
            });
            modals.closeAll();
        },
        onError: (err: Error, _vars, ctx) => {
            if (ctx?.snapshot) queryClient.setQueryData(QUERY_KEY, ctx.snapshot);
            notifications.show({
                title: "Invite failed",
                message: err.message,
                color: colors.danger,
                icon: <IconAlertCircle size={18} />,
            });
        },
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
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
        onMutate: async (patientId) => {
            await queryClient.cancelQueries({ queryKey: QUERY_KEY });
            const snapshot = queryClient.getQueryData<DoctorPatientDto[]>(QUERY_KEY);
            queryClient.setQueryData<DoctorPatientDto[]>(QUERY_KEY, (old = []) =>
                old.filter((p) => p.patientId !== patientId),
            );
            return { snapshot };
        },
        onSuccess: () => {
            notifications.show({
                title: "Access revoked",
                message: "Patient no longer has consent granted.",
                color: colors.success,
                icon: <IconCheck size={18} />,
            });
        },
        onError: (err: Error, _id, ctx) => {
            if (ctx?.snapshot) queryClient.setQueryData(QUERY_KEY, ctx.snapshot);
            notifications.show({
                title: "Failed",
                message: err.message,
                color: colors.danger,
                icon: <IconAlertCircle size={18} />,
            });
        },
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
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
            <style>{allKeyframes}</style>

            {/* Header */}
            <Box style={{ animation: ios.animation.fadeSlideUp() }}>
                <Group justify="space-between" align="flex-start">
                    <Group gap="sm" align="center">
                        <Box
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: "light-dark(rgba(99,102,241,0.1), rgba(99,102,241,0.15))",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "var(--mantine-color-primary-5)",
                            }}
                        >
                            <IconUsers size={20} />
                        </Box>
                        <Box>
                            <Text style={iosLargeTitle}>My Patients</Text>
                            <Text style={iosSubtitle}>
                                Manage patient consent and view health data.
                            </Text>
                        </Box>
                    </Group>
                    <Button
                        leftSection={<IconUserPlus size={16} />}
                        onClick={openInviteModal}
                        radius="xl"
                        style={{ fontWeight: 600 }}
                    >
                        Invite Patient
                    </Button>
                </Group>
            </Box>

            {error && (
                <Box
                    style={{
                        ...iosCard,
                        padding: "12px 16px",
                        animation: ios.animation.scaleIn(),
                    }}
                >
                    <Group gap="sm">
                        <IconAlertCircle size={18} color="var(--mantine-color-red-6)" />
                        <Text size="sm" c="red">Failed to load patients. Please refresh.</Text>
                    </Group>
                </Box>
            )}

            {/* Tabs */}
            <Box style={{ animation: ios.animation.fadeSlideUp("100ms") }}>
                <Tabs defaultValue="active">
                    <Tabs.List>
                        <Tabs.Tab
                            value="active"
                            leftSection={<IconUserCheck size={15} />}
                            rightSection={
                                !isLoading && accepted.length > 0 ? (
                                    <Badge size="xs" color={colors.success} variant="filled" circle radius="xl">
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
                                    <Badge size="xs" color="yellow" variant="filled" circle radius="xl">
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
                                    <Box key={i} style={{ ...iosCard, padding: "14px 16px" }}>
                                        <Group gap="md">
                                            <Skeleton radius="xl" width={42} height={42} />
                                            <Stack gap={4} style={{ flex: 1 }}>
                                                <Skeleton height={14} width="40%" radius="md" />
                                                <Skeleton height={12} width="25%" radius="md" />
                                            </Stack>
                                        </Group>
                                    </Box>
                                ))
                                : accepted.length === 0
                                    ? <EmptyState message="No active patients yet. Invite patients to get started." />
                                    : accepted.map((p, i) => (
                                        <Box
                                            key={p.patientId}
                                            style={{ animation: ios.animation.fadeSlideUp(ios.stagger(i)) }}
                                        >
                                            <PatientCard
                                                patient={p}
                                                onRevoke={confirmRevoke}
                                                onReinvite={confirmReinvite}
                                            />
                                        </Box>
                                    ))
                            }
                        </Stack>
                    </Tabs.Panel>

                    <Tabs.Panel value="pending" pt="md">
                        <Stack gap="sm">
                            {isLoading
                                ? Array.from({ length: 2 }).map((_, i) => (
                                    <Box key={i} style={{ ...iosCard, padding: "14px 16px" }}>
                                        <Group gap="md">
                                            <Skeleton radius="xl" width={42} height={42} />
                                            <Stack gap={4} style={{ flex: 1 }}>
                                                <Skeleton height={14} width="40%" radius="md" />
                                                <Skeleton height={12} width="25%" radius="md" />
                                            </Stack>
                                        </Group>
                                    </Box>
                                ))
                                : pending.length === 0
                                    ? <EmptyState message="No pending invites. Invite a patient to connect." />
                                    : pending.map((p, i) => (
                                        <Box
                                            key={p.patientId}
                                            style={{ animation: ios.animation.fadeSlideUp(ios.stagger(i)) }}
                                        >
                                            <PatientCard
                                                patient={p}
                                                onRevoke={confirmRevoke}
                                                onReinvite={confirmReinvite}
                                            />
                                        </Box>
                                    ))
                            }
                        </Stack>
                    </Tabs.Panel>
                </Tabs>
            </Box>

            <Box
                style={{
                    ...iosCard,
                    padding: "14px 16px",
                    background: "light-dark(var(--mantine-color-primary-0), rgba(107,79,248,0.06))",
                    animation: ios.animation.fadeSlideUp("200ms"),
                }}
            >
                <Group gap="xs" align="flex-start">
                    <Box
                        style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: "light-dark(rgba(99,102,241,0.1), rgba(99,102,241,0.15))",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: 2,
                        }}
                    >
                        <IconUserCheck size={14} color="var(--mantine-color-primary-5)" />
                    </Box>
                    <Stack gap={2}>
                        <Text size="sm" fw={500}>Patient consent</Text>
                        <Text size="xs" c="dimmed">
                            Patients must accept your invite before you can view their health records, vitals, and history.
                            Invites can be revoked or re-sent at any time.
                        </Text>
                    </Stack>
                </Group>
            </Box>
        </Stack>
    );
}
