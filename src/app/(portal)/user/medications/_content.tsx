"use client";
import {
    ActionIcon,
    Box,
    Button,
    Container,
    Group,
    Loader,
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
    useMedicationsInfiniteQuery,
    useDeleteMedicationMutation,
    useUpdateMedicationMutation,
    type MedicationRecord,
} from "@/app/(portal)/user/_query";
import { colors } from "@/ui/tokens";
import { MedicationModal } from "./_medication-modal";
import { MedicationCard } from "./_medication-card";
import { MedicationSkeletons, EmptyState } from "./_skeletons";

type StatusFilter = "all" | "active" | "paused" | "completed" | "discontinued";

export interface MedicationsInitialFilters {
    status?: StatusFilter;
    q?: string;
    sortDir?: "asc" | "desc";
}

// ── Medications Content ───────────────────────────────────────────────────────

export function MedicationsContent({
    initialFilters,
}: Readonly<{ initialFilters?: MedicationsInitialFilters }>) {
    const deleteMutation = useDeleteMedicationMutation();
    const updateMutation = useUpdateMedicationMutation();
    const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
    const [editTarget, setEditTarget] = useState<MedicationRecord | null>(null);
    const [search, setSearch] = useState(initialFilters?.q ?? "");
    const [debouncedSearch] = useDebouncedValue(search, 250);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialFilters?.status ?? "all");
    const [sortDir, setSortDir] = useState<"asc" | "desc">(initialFilters?.sortDir ?? "desc");

    const {
        data,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
    } = useMedicationsInfiniteQuery({
        status: statusFilter === "all" ? undefined : statusFilter,
        q: debouncedSearch.trim() || undefined,
        sortDir,
    });

    const medications = data?.pages.flatMap((page) => page.medications) ?? [];
    const totalCount = data?.pages[0]?.totalCount;

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

    let subtitle = "Manage your medication list";
    if (totalCount !== undefined) {
        const label = totalCount === 1 ? "medication" : "medications";
        subtitle = `${totalCount} ${label}`;
    }

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
                            <Text size="xs" c="dimmed">{subtitle}</Text>
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
                            onChange={(e) => setSearch(e.currentTarget.value)}
                        />
                        <Group grow>
                            <SegmentedControl
                                size="xs"
                                value={statusFilter}
                                onChange={(v) => setStatusFilter(v as StatusFilter)}
                                data={[
                                    { value: "all", label: "All" },
                                    { value: "active", label: "Active" },
                                    { value: "paused", label: "Paused" },
                                    { value: "completed", label: "Completed" },
                                    { value: "discontinued", label: "Stopped" },
                                ]}
                            />
                            <SegmentedControl
                                size="xs"
                                value={sortDir}
                                onChange={(value) => setSortDir(value as "asc" | "desc")}
                                data={[
                                    { value: "desc", label: "Newest" },
                                    { value: "asc", label: "Oldest" },
                                ]}
                            />
                        </Group>
                    </Stack>
                )}

                <Box>
                    {isLoading && <MedicationSkeletons />}

                    {!isLoading && medications.length === 0 && (
                        <EmptyState onAdd={openAdd} />
                    )}

                    {!isLoading && medications.length > 0 && (
                        <Stack gap="sm">
                            {medications.map((m) => (
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
                            {hasNextPage ? (
                                <Group justify="center" mt="md">
                                    <Button
                                        variant="subtle"
                                        color="gray"
                                        size="sm"
                                        loading={isFetchingNextPage}
                                        rightSection={isFetchingNextPage ? <Loader size={14} /> : undefined}
                                        onClick={() => {
                                            fetchNextPage();
                                        }}
                                    >
                                        Load more
                                    </Button>
                                </Group>
                            ) : null}
                        </Stack>
                    )}
                </Box>
            </Stack>
        </Container>
    );
}
