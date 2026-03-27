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
    IconHeartFilled,
    IconPlus,
    IconSearch,
    IconSortAscending,
    IconSortDescending,
} from "@tabler/icons-react";
import { useState } from "react";

import {
    useVitalsQuery,
    useDeleteVitalMutation,
    type VitalRecord,
} from "@/app/(portal)/user/_query";
import { colors } from "@/ui/tokens";
import { VitalModal } from "./_vital-modal";
import { VitalCard } from "./_vital-card";
import { VitalSkeletons, EmptyState } from "./_skeletons";

const PAGE_SIZE = 10;
type VitalFilter = "all" | "bp" | "hr" | "spo2" | "temp" | "glucose" | "weight";

// ── Filter helpers ────────────────────────────────────────────────────────────

function matchesFilter(v: VitalRecord, filter: VitalFilter): boolean {
    if (filter === "all") return true;
    if (filter === "bp") return v.systolicBp !== undefined && v.diastolicBp !== undefined;
    if (filter === "hr") return v.restingHr !== undefined;
    if (filter === "spo2") return v.spo2 !== undefined;
    if (filter === "temp") return v.temperatureC !== undefined;
    if (filter === "glucose") return v.glucoseMgdl !== undefined;
    if (filter === "weight") return v.weightKg !== undefined;
    return true;
}

function matchesSearch(v: VitalRecord, q: string): boolean {
    if (!q) return true;
    const lower = q.toLowerCase();
    // Search by date, category, or numeric value
    const searchable = [
        v.measuredAt,
        v.bpCategory,
        v.hrCategory,
        v.spo2Category,
        v.tempCategory,
        v.glucoseCategory,
        v.systolicBp !== undefined ? `${v.systolicBp}/${v.diastolicBp}` : "",
        v.restingHr !== undefined ? `${v.restingHr} bpm` : "",
        v.spo2 !== undefined ? `${v.spo2}%` : "",
        v.temperatureC !== undefined ? `${v.temperatureC}` : "",
        v.glucoseMgdl !== undefined ? `${v.glucoseMgdl}` : "",
        v.weightKg !== undefined ? `${v.weightKg} kg` : "",
    ].join(" ").toLowerCase();
    return searchable.includes(lower);
}

// ── Vitals Content ────────────────────────────────────────────────────────────

export function VitalsContent() {
    const { data: vitals = [], isLoading } = useVitalsQuery();
    const deleteMutation = useDeleteVitalMutation();
    const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
    const [search, setSearch] = useState("");
    const [debouncedSearch] = useDebouncedValue(search, 250);
    const [filter, setFilter] = useState<VitalFilter>("all");
    const [sortAsc, setSortAsc] = useState(false);
    const [page, setPage] = useState(1);

    function handleDelete(id: string) {
        modals.openConfirmModal({
            title: "Delete vital reading?",
            children: (
                <Text size="sm">
                    This vital reading will be permanently removed.
                </Text>
            ),
            labels: { confirm: "Delete", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => {
                deleteMutation.mutate(id, {
                    onSuccess: () =>
                        notifications.show({
                            title: "Vital deleted",
                            message: "The reading has been removed.",
                            color: colors.success,
                            icon: <IconCheck size={16} />,
                        }),
                    onError: () =>
                        notifications.show({
                            title: "Delete failed",
                            message: "Could not delete vital reading. Please try again.",
                            color: colors.danger,
                        }),
                });
            },
        });
    }

    // ── Filtering + Sorting ──────────────────────────────────────────
    const filtered = vitals
        .filter((v) => matchesFilter(v, filter) && matchesSearch(v, debouncedSearch))
        .slice()
        .sort((a, b) => {
            const cmp = new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime();
            return sortAsc ? cmp : -cmp;
        });

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    return (
        <Container pt="md">
            <VitalModal opened={addOpened} onClose={closeAdd} />

            <Stack>
                <Group justify="space-between" align="center" wrap="nowrap">
                    <Group gap="sm">
                        <ThemeIcon size={36} radius="md" color="red" variant="light">
                            <IconHeartFilled size={20} />
                        </ThemeIcon>
                        <Box>
                            <Title order={4} lh={1.2}>My Vitals</Title>
                            <Text size="xs" c="dimmed">
                                {vitals.length > 0
                                    ? `${vitals.length} reading${vitals.length === 1 ? "" : "s"}`
                                    : "Track your vital signs"}
                            </Text>
                        </Box>
                    </Group>
                    {/* Mobile: Icon-only button */}
                    <Tooltip label="Log Vitals" withArrow hiddenFrom="sm">
                        <ActionIcon
                            size={32}
                            variant="light"
                            color="primary"
                            onClick={openAdd}
                            hiddenFrom="sm"
                            aria-label="Log Vitals"
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
                        Log
                    </Button>
                </Group>

                {/* Search + Filter */}
                {!isLoading && vitals.length > 0 && (
                    <Stack gap="sm">
                        <Group gap="xs">
                            <TextInput
                                placeholder="Search vitals…"
                                leftSection={<IconSearch size={15} />}
                                size="sm"
                                value={search}
                                onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
                                style={{ flex: 1 }}
                            />
                            <Box
                                component="button"
                                onClick={() => setSortAsc((p) => !p)}
                                style={{
                                    all: "unset",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    fontSize: "var(--mantine-font-size-xs)",
                                    color: "var(--mantine-color-dimmed)",
                                }}
                            >
                                {sortAsc ? <IconSortAscending size={14} /> : <IconSortDescending size={14} />}
                                {sortAsc ? "Oldest" : "Newest"}
                            </Box>
                        </Group>
                        <SegmentedControl
                            size="xs"
                            value={filter}
                            onChange={(v) => { setFilter(v as VitalFilter); setPage(1); }}
                            data={[
                                { value: "all", label: "All" },
                                { value: "bp", label: "BP" },
                                { value: "hr", label: "HR" },
                                { value: "spo2", label: "SpO2" },
                                { value: "temp", label: "Temp" },
                                { value: "glucose", label: "Glucose" },
                                { value: "weight", label: "Weight" },
                            ]}
                        />
                    </Stack>
                )}

                <Box>
                    {isLoading && <VitalSkeletons />}

                    {!isLoading && vitals.length === 0 && (
                        <EmptyState onAdd={openAdd} />
                    )}

                    {!isLoading && vitals.length > 0 && (
                        <Stack gap="sm">
                            {filtered.length === 0 && (
                                <Text size="sm" c="dimmed" ta="center" py="xl">
                                    No vitals match your filters.
                                </Text>
                            )}
                            {paginated.map((v) => (
                                <VitalCard
                                    key={v.id}
                                    vital={v}
                                    isPendingDelete={deleteMutation.isPending && deleteMutation.variables === v.id}
                                    onDelete={() => handleDelete(v.id)}
                                    isOptimistic={v.id.startsWith("__optimistic__")}
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
