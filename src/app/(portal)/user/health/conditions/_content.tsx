"use client";
import {
    ActionIcon,
    Badge,
    Box,
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
import { useDebouncedValue } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
    IconAlertCircle,
    IconCheck,
    IconHeartbeat,
    IconSearch,
    IconSortAscending,
    IconSortDescending,
    IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";

import {
    useConditionsQuery,
    useDeleteConditionMutation,
    type ConditionRecord,
} from "@/app/(portal)/user/_query";
import { colors } from "@/ui/tokens";
import { ConditionSkeletons, EmptyState } from "./_skeletons";

const PAGE_SIZE = 10;

type StatusFilter = "all" | "suspected" | "probable" | "confirmed";

const SEVERITY_COLOR: Record<ConditionRecord["severity"], string> = {
    mild: "teal",
    moderate: "yellow",
    severe: "orange",
    critical: "red",
};

const STATUS_COLOR: Record<ConditionRecord["status"], string> = {
    suspected: "gray",
    probable: "blue",
    confirmed: "indigo",
};

// ── Condition Card ────────────────────────────────────────────────────────────

function ConditionCard({
    condition,
    onDelete,
}: Readonly<{ condition: ConditionRecord; onDelete: (id: string) => void }>) {
    const [hovered, setHovered] = useState(false);
    return (
        <Box
            p="md"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={(t) => ({
                border: `1px solid ${t.colors.gray[2]}`,
                borderRadius: t.radius.md,
                transition: "box-shadow 0.15s ease",
                boxShadow: hovered ? t.shadows.sm : undefined,
                background: hovered
                    ? "light-dark(var(--mantine-color-gray-0), rgba(255,255,255,0.04))"
                    : undefined,
            })}
        >
            <Group justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                    <ThemeIcon
                        size={36}
                        radius="xl"
                        variant="light"
                        color={SEVERITY_COLOR[condition.severity]}
                    >
                        <IconHeartbeat size={18} />
                    </ThemeIcon>
                    <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                        <Group gap="xs" wrap="nowrap">
                            <Text fw={600} size="sm" style={{ lineHeight: 1.3 }} truncate>
                                {condition.name}
                            </Text>
                            {condition.icd10 && (
                                <Text size="xs" c="dimmed">
                                    ({condition.icd10})
                                </Text>
                            )}
                        </Group>
                        {condition.description && (
                            <Text size="xs" c="dimmed" lineClamp={2}>
                                {condition.description}
                            </Text>
                        )}
                        {condition.symptoms.length > 0 && (
                            <Text size="xs" c="dimmed">
                                Symptoms:{" "}
                                {condition.symptoms.slice(0, 3).join(", ")}
                                {condition.symptoms.length > 3 &&
                                    ` +${condition.symptoms.length - 3} more`}
                            </Text>
                        )}
                    </Stack>
                </Group>
                <Group gap="xs" wrap="nowrap">
                    <Badge
                        size="sm"
                        variant="light"
                        color={SEVERITY_COLOR[condition.severity]}
                    >
                        {condition.severity}
                    </Badge>
                    <Badge
                        size="sm"
                        variant="outline"
                        color={STATUS_COLOR[condition.status]}
                    >
                        {condition.status}
                    </Badge>
                    <Tooltip label="Delete condition" withArrow>
                        <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="red"
                            onClick={() => onDelete(condition.id)}
                        >
                            <IconTrash size={14} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>
        </Box>
    );
}

// ── Conditions Content ────────────────────────────────────────────────────────

export function ConditionsContent() {
    const { data: conditions = [], isLoading } = useConditionsQuery();
    const deleteMutation = useDeleteConditionMutation();
    const [search, setSearch] = useState("");
    const [debouncedSearch] = useDebouncedValue(search, 250);
    const [filter, setFilter] = useState<StatusFilter>("all");
    const [sortAsc, setSortAsc] = useState(false);
    const [page, setPage] = useState(1);

    function handleDelete(id: string) {
        modals.openConfirmModal({
            title: "Remove condition?",
            children: (
                <Text size="sm">
                    This condition will be permanently removed from your health record.
                </Text>
            ),
            labels: { confirm: "Remove", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => {
                deleteMutation.mutate(id, {
                    onSuccess: () => {
                        notifications.show({
                            title: "Condition removed",
                            message: "The condition has been deleted.",
                            color: colors.success,
                            icon: <IconCheck size={18} />,
                        });
                    },
                    onError: () => {
                        notifications.show({
                            title: "Error",
                            message: "Could not remove the condition. Please try again.",
                            color: colors.danger,
                            icon: <IconAlertCircle size={18} />,
                        });
                    },
                });
            },
        });
    }

    const filtered = conditions
        .filter((c) => {
            if (filter !== "all" && c.status !== filter) return false;
            if (debouncedSearch) {
                const q = debouncedSearch.toLowerCase();
                return (
                    c.name.toLowerCase().includes(q) ||
                    c.description?.toLowerCase().includes(q) ||
                    c.icd10?.toLowerCase().includes(q) ||
                    c.symptoms.some((s) => s.toLowerCase().includes(q))
                );
            }
            return true;
        })
        .sort((a, b) => {
            const diff =
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            return sortAsc ? diff : -diff;
        });

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <Container pt="md">
            <Stack>
                {/* Header */}
                <Group justify="space-between">
                    <Group gap="sm">
                        <ThemeIcon size={36} radius="xl" variant="light" color="indigo">
                            <IconHeartbeat size={18} />
                        </ThemeIcon>
                        <Stack gap={2}>
                            <Title order={4}>Conditions</Title>
                            <Text size="xs" c="dimmed">
                                {conditions.length} condition
                                {conditions.length !== 1 ? "s" : ""} recorded
                            </Text>
                        </Stack>
                    </Group>
                    <Tooltip label={sortAsc ? "Oldest first" : "Newest first"} withArrow>
                        <ActionIcon
                            variant="light"
                            onClick={() => { setPage(1); setSortAsc((v) => !v); }}
                        >
                            {sortAsc ? (
                                <IconSortAscending size={16} />
                            ) : (
                                <IconSortDescending size={16} />
                            )}
                        </ActionIcon>
                    </Tooltip>
                </Group>

                {/* Search */}
                <TextInput
                    placeholder="Search conditions…"
                    leftSection={<IconSearch size={14} />}
                    value={search}
                    onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
                />

                {/* Status filter */}
                <SegmentedControl
                    size="xs"
                    value={filter}
                    onChange={(v) => { setFilter(v as StatusFilter); setPage(1); }}
                    data={[
                        { label: "All", value: "all" },
                        { label: "Suspected", value: "suspected" },
                        { label: "Probable", value: "probable" },
                        { label: "Confirmed", value: "confirmed" },
                    ]}
                />

                {/* List */}
                {isLoading ? (
                    <ConditionSkeletons />
                ) : paginated.length === 0 ? (
                    <EmptyState />
                ) : (
                    <Stack gap="sm">
                        {paginated.map((c) => (
                            <ConditionCard key={c.id} condition={c} onDelete={handleDelete} />
                        ))}
                    </Stack>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <Group justify="center">
                        <Pagination total={totalPages} value={page} onChange={setPage} size="sm" />
                    </Group>
                )}
            </Stack>
        </Container>
    );
}
