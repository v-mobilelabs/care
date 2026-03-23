"use client";
import {
    ActionIcon,
    Box,
    Button,
    Container,
    Group,
    Pagination,
    SegmentedControl,
    Stack,
    Text,
    TextInput,
    ThemeIcon,
    Title,
    Tooltip,
} from "@mantine/core";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
    IconCheck,
    IconPillFilled,
    IconPlus,
    IconSearch,
} from "@tabler/icons-react";
import { useState } from "react";

import {
    useMedicationsQuery,
    useDeleteMedicationMutation,
    useUpdateMedicationMutation,
    type MedicationRecord,
} from "@/app/(portal)/patient/_query";
import { colors } from "@/ui/tokens";
import { MedicationModal } from "./_medication-modal";
import { MedicationCard } from "./_medication-card";
import { MedicationSkeletons, EmptyState } from "./_skeletons";

const PAGE_SIZE = 10;
type StatusFilter = "all" | "active" | "paused" | "past";

// ── Medications Content ───────────────────────────────────────────────────────

export function MedicationsContent() {
    const { data: medications = [], isLoading } = useMedicationsQuery();
    const deleteMutation = useDeleteMedicationMutation();
    const updateMutation = useUpdateMedicationMutation();
    const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
    const [editTarget, setEditTarget] = useState<MedicationRecord | null>(null);
    const [search, setSearch] = useState("");
    const [debouncedSearch] = useDebouncedValue(search, 250);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [page, setPage] = useState(1);

    function handleDelete(id: string, name: string) {
        modals.openConfirmModal({
            title: "Remove medication?",
            children: (
                <Text size="sm">
                    <strong>{name}</strong> will be permanently removed from your medications list.
                </Text>
            ),
            labels: { confirm: "Remove", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => {
                deleteMutation.mutate(id, {
                    onSuccess: () =>
                        notifications.show({
                            title: "Medication removed",
                            message: `${name} has been removed.`,
                            color: colors.success,
                            icon: <IconCheck size={16} />,
                        }),
                    onError: () =>
                        notifications.show({
                            title: "Delete failed",
                            message: `Could not remove ${name}. Please try again.`,
                            color: colors.danger,
                        }),
                });
            },
        });
    }

    function handleToggleStatus(med: MedicationRecord) {
        const newStatus = med.status === "active" ? "paused" : "active";
        updateMutation.mutate(
            { medicationId: med.id, status: newStatus },
            {
                onSuccess: () =>
                    notifications.show({
                        title: newStatus === "active" ? "Medication resumed" : "Medication paused",
                        message: `${med.name} is now ${newStatus}.`,
                        color: newStatus === "active" ? colors.success : colors.warning,
                        icon: <IconCheck size={16} />,
                    }),
                onError: (err) =>
                    notifications.show({
                        title: "Update failed",
                        message: err instanceof Error ? err.message : "Could not update medication status.",
                        color: colors.danger,
                    }),
            },
        );
    }

    // ── Filtering ────────────────────────────────────────────────────────────
    const filtered = medications.filter((m) => {
        const matchesSearch = debouncedSearch === "" ||
            m.name.toLowerCase().includes(debouncedSearch.toLowerCase());
        const matchesStatus = (() => {
            if (statusFilter === "all") return true;
            if (statusFilter === "active") return m.status === "active";
            if (statusFilter === "paused") return m.status === "paused";
            return m.status === "completed" || m.status === "discontinued";
        })();
        return matchesSearch && matchesStatus;
    });

    // Reset page when filters change
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const activeCount = medications.filter((m) => m.status === "active").length;

    return (
        <Container pt="md">
            {/* Add/Edit Modals */}
            <MedicationModal opened={addOpened} onClose={closeAdd} />
            {editTarget && (
                <MedicationModal
                    opened={!!editTarget}
                    onClose={() => setEditTarget(null)}
                    initial={editTarget}
                />
            )}

            <Stack>
                <Group justify="space-between" align="center" wrap="nowrap">
                    <Group gap="sm">
                        <ThemeIcon size={36} radius="md" color="violet" variant="light">
                            <IconPillFilled size={20} />
                        </ThemeIcon>
                        <Box>
                            <Title order={4} lh={1.2}>My Medications</Title>
                            <Text size="xs" c="dimmed">
                                {medications.length > 0
                                    ? `${activeCount} active · ${medications.length} total`
                                    : "Manage your medication list"}
                            </Text>
                        </Box>
                    </Group>
                    {/* Mobile: Icon-only button */}
                    <Tooltip label="Add Medication" withArrow hiddenFrom="sm">
                        <ActionIcon
                            size={32}
                            variant="light"
                            color="primary"
                            onClick={openAdd}
                            hiddenFrom="sm"
                            aria-label="Add Medication"
                        >
                            <IconPlus size={16} />
                        </ActionIcon>
                    </Tooltip>
                    {/* Desktop: Full button */}
                    <Button
                        leftSection={<IconPlus size={15} />}
                        size="sm"
                        color="primary"
                        variant="light"
                        onClick={openAdd}
                        visibleFrom="sm"
                    >
                        Add
                    </Button>
                </Group>

                {/* Search + Filter */}
                {!isLoading && medications.length > 0 && (
                    <Stack gap="sm">
                        <TextInput
                            placeholder="Search medications…"
                            leftSection={<IconSearch size={15} />}
                            size="sm"
                            value={search}
                            onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
                        />
                        <SegmentedControl
                            size="xs"
                            value={statusFilter}
                            onChange={(v) => { setStatusFilter(v as StatusFilter); setPage(1); }}
                            data={[
                                { value: "all", label: "All" },
                                { value: "active", label: "Active" },
                                { value: "paused", label: "Paused" },
                            ]}
                        />
                    </Stack>
                )}

                <Box>
                    {isLoading && <MedicationSkeletons />}

                    {!isLoading && medications.length === 0 && (
                        <EmptyState onAdd={openAdd} />
                    )}

                    {!isLoading && medications.length > 0 && (
                        <Stack gap="sm">
                            {filtered.length === 0 && (
                                <Text size="sm" c="dimmed" ta="center" py="xl">
                                    No medications match your filters.
                                </Text>
                            )}
                            {paginated.map((m) => (
                                <MedicationCard
                                    key={m.id}
                                    med={m}
                                    onEdit={() => setEditTarget(m)}
                                    isPendingDelete={deleteMutation.isPending && deleteMutation.variables === m.id}
                                    onDelete={() => handleDelete(m.id, m.name)}
                                    onToggleStatus={() => handleToggleStatus(m)}
                                    isTogglingStatus={updateMutation.isPending && updateMutation.variables?.medicationId === m.id}
                                    isOptimistic={m.id.startsWith("__optimistic__")}
                                />
                            ))}
                            {totalPages > 1 && (
                                <Group justify="center" mt="md">
                                    <Pagination
                                        size="sm"
                                        total={totalPages}
                                        value={safePage}
                                        onChange={setPage}
                                    />
                                </Group>
                            )}
                        </Stack>
                    )}
                </Box>
            </Stack>
        </Container>
    );
}
