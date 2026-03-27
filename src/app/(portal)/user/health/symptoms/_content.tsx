"use client";
import {
    Alert,
    Box,
    Button,
    Container,
    Group,
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
    IconAlertTriangle,
    IconActivityHeartbeat,
    IconCheck,
    IconInfoCircle,
    IconPlus,
    IconSearch,
    IconSortAscending,
    IconSortDescending,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

import {
    useSymptomObservationsQuery,
    useDeleteSymptomObservationMutation,
    type SymptomObservationRecord,
    type SymptomObservationState,
} from "@/ui/ai/query";
import { colors } from "@/ui/tokens";
import { ObservationCard } from "./_observation-card";
import { ObservationSkeletons, EmptyState, NoResultsState } from "./_skeletons";
import { AddObservationModal } from "./_add-modal";

// ── Safety disclaimer ─────────────────────────────────────────────────────────

function SafetyDisclaimer() {
    return (
        <Alert
            icon={<IconInfoCircle size={16} />}
            color="gray"
            variant="light"
            radius="md"
            py={10}
            px="md"
        >
            <Text size="xs" c="dimmed" lh={1.5}>
                This symptom timeline is personal documentation to support conversations
                with your care team. It is <strong>not</strong> a substitute for
                professional medical advice, diagnosis, or autonomous clinical
                decision-making. Always consult a qualified healthcare provider.
            </Text>
        </Alert>
    );
}

// ── Red-flag summary banner ───────────────────────────────────────────────────

function RedFlagBanner({
    observations,
}: Readonly<{ observations: SymptomObservationRecord[] }>) {
    const redFlags = observations.filter(
        (o) => o.severity !== undefined && o.severity >= 8 && o.state === "worsening",
    );

    if (redFlags.length === 0) return null;

    return (
        <Alert
            icon={<IconAlertTriangle size={16} />}
            color="red"
            variant="light"
            radius="md"
            py={10}
            px="md"
            title="Urgent symptoms detected"
        >
            <Text size="xs" lh={1.5}>
                You have {redFlags.length} high-severity worsening symptom
                {redFlags.length > 1 ? "s" : ""} on record. If you are experiencing
                an emergency, call your local emergency services immediately.
            </Text>
        </Alert>
    );
}

// ── Lazy load sentinel ────────────────────────────────────────────────────────

function LazyLoadSentinel({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
}: Readonly<{
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void;
}>) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el || !hasNextPage) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry?.isIntersecting && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { rootMargin: "200px" },
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    if (!hasNextPage) return null;

    return (
        <Box ref={ref} py="md" ta="center">
            <Text size="xs" c="dimmed">
                {isFetchingNextPage ? "Loading more…" : ""}
            </Text>
        </Box>
    );
}

// ── Filtering helpers ─────────────────────────────────────────────────────────

type StateFilter = "all" | SymptomObservationState;

function matchesSearch(o: SymptomObservationRecord, q: string): boolean {
    if (!q) return true;
    const lower = q.toLowerCase();
    return [
        o.symptom,
        o.onset ?? "",
        o.duration ?? "",
        o.notes ?? "",
        ...(o.triggers ?? []),
        ...(o.alleviators ?? []),
    ].join(" ").toLowerCase().includes(lower);
}

function matchesStateFilter(
    o: SymptomObservationRecord,
    filter: StateFilter,
): boolean {
    if (filter === "all") return true;
    return o.state === filter;
}

// ── Page header ───────────────────────────────────────────────────────────────

function PageHeader({
    conditionId,
    onAdd,
}: Readonly<{ conditionId?: string; onAdd: () => void }>) {
    return (
        <Group justify="space-between" align="center" wrap="nowrap">
            <Group gap="sm" wrap="nowrap">
                <ThemeIcon size={36} radius="md" color="primary" variant="light">
                    <IconActivityHeartbeat size={20} />
                </ThemeIcon>
                <Box>
                    <Title order={4} lh={1.2}>
                        Symptom Timeline
                    </Title>
                    <Text size="xs" c="dimmed">
                        {conditionId
                            ? "Observations linked to this condition"
                            : "All logged symptom observations"}
                    </Text>
                </Box>
            </Group>
            <Button
                leftSection={<IconPlus size={15} />}
                size="sm"
                onClick={onAdd}
            >
                Log symptom
            </Button>
        </Group>
    );
}

// ── Search + filter bar ───────────────────────────────────────────────────────

function SearchFilterBar({
    search,
    stateFilter,
    sortDir,
    onSearch,
    onStateFilter,
    onToggleSort,
}: Readonly<{
    search: string;
    stateFilter: StateFilter;
    sortDir: "asc" | "desc";
    onSearch: (v: string) => void;
    onStateFilter: (v: StateFilter) => void;
    onToggleSort: () => void;
}>) {
    return (
        <Stack gap="sm">
            <Group gap="sm" wrap="nowrap">
                <TextInput
                    flex={1}
                    placeholder="Search symptoms, notes, triggers…"
                    leftSection={<IconSearch size={15} />}
                    value={search}
                    onChange={(e) => onSearch(e.currentTarget.value)}
                />
                <Tooltip
                    label={
                        sortDir === "desc"
                            ? "Newest first — click for oldest first"
                            : "Oldest first — click for newest first"
                    }
                    withArrow
                >
                    <Button
                        variant="light"
                        color="gray"
                        px="sm"
                        size="sm"
                        onClick={onToggleSort}
                        leftSection={
                            sortDir === "desc"
                                ? <IconSortDescending size={16} />
                                : <IconSortAscending size={16} />
                        }
                    >
                        {sortDir === "desc" ? "Newest" : "Oldest"}
                    </Button>
                </Tooltip>
            </Group>
            <SegmentedControl
                size="xs"
                value={stateFilter}
                onChange={(v) => onStateFilter(v as StateFilter)}
                data={[
                    { label: "All", value: "all" },
                    { label: "Improving", value: "improving" },
                    { label: "Stable", value: "stable" },
                    { label: "Worsening", value: "worsening" },
                ]}
            />
        </Stack>
    );
}

// ── Observation list ──────────────────────────────────────────────────────────

function ObservationList({
    observations,
    pendingDeleteId,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    onDelete,
}: Readonly<{
    observations: SymptomObservationRecord[];
    pendingDeleteId: string | undefined;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void;
    onDelete: (id: string) => void;
}>) {
    return (
        <Stack gap="sm">
            {observations.map((obs) => (
                <ObservationCard
                    key={obs.id}
                    observation={obs}
                    isPendingDelete={pendingDeleteId === obs.id}
                    onDelete={onDelete}
                    isOptimistic={obs.id.startsWith("__optimistic__")}
                />
            ))}
            <LazyLoadSentinel
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
            />
        </Stack>
    );
}

// ── Main content ──────────────────────────────────────────────────────────────

export function SymptomsContent({
    conditionId,
}: Readonly<{ conditionId?: string }>) {
    const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
    const [search, setSearch] = useState("");
    const [debouncedSearch] = useDebouncedValue(search, 250);
    const [stateFilter, setStateFilter] = useState<StateFilter>("all");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
        useSymptomObservationsQuery({ conditionId, sortDir });

    const deleteMutation = useDeleteSymptomObservationMutation({ conditionId, sortDir });

    const allObservations = data?.pages.flatMap((p) => p.observations) ?? [];
    const filtered = allObservations.filter(
        (o) => matchesSearch(o, debouncedSearch) && matchesStateFilter(o, stateFilter),
    );
    const hasAnyData = allObservations.length > 0;

    function handleDelete(id: string) {
        modals.openConfirmModal({
            title: "Delete observation?",
            children: (
                <Text size="sm">
                    This symptom observation will be permanently removed from your timeline.
                </Text>
            ),
            labels: { confirm: "Delete", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => {
                deleteMutation.mutate(id, {
                    onSuccess: () =>
                        notifications.show({
                            title: "Observation deleted",
                            message: "The entry has been removed from your timeline.",
                            color: colors.success,
                            icon: <IconCheck size={16} />,
                        }),
                    onError: () =>
                        notifications.show({
                            title: "Delete failed",
                            message: "Could not delete the observation. Please try again.",
                            color: colors.danger,
                        }),
                });
            },
        });
    }

    return (
        <Container pt="md">
            <Stack gap="lg">
                <PageHeader conditionId={conditionId} onAdd={openAdd} />
                <SafetyDisclaimer />
                {hasAnyData && <RedFlagBanner observations={allObservations} />}
                {hasAnyData && (
                    <SearchFilterBar
                        search={search}
                        stateFilter={stateFilter}
                        sortDir={sortDir}
                        onSearch={setSearch}
                        onStateFilter={setStateFilter}
                        onToggleSort={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                    />
                )}
                {isLoading && <ObservationSkeletons />}
                {!isLoading && !hasAnyData && <EmptyState onAdd={openAdd} />}
                {hasAnyData && !isLoading && filtered.length === 0 && <NoResultsState />}
                {!isLoading && filtered.length > 0 && (
                    <ObservationList
                        observations={filtered}
                        pendingDeleteId={
                            deleteMutation.isPending
                                ? (deleteMutation.variables as string)
                                : undefined
                        }
                        hasNextPage={hasNextPage ?? false}
                        isFetchingNextPage={isFetchingNextPage}
                        fetchNextPage={fetchNextPage}
                        onDelete={handleDelete}
                    />
                )}
            </Stack>
            <AddObservationModal
                opened={addOpened}
                conditionId={conditionId}
                onClose={closeAdd}
            />
        </Container>
    );
}
