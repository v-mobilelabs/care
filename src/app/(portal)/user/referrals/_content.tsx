"use client";
import { MotionCard } from "@/ui/components/motion-card";

import {
    Badge,
    Box,
    Button,
    Checkbox,
    Container,
    Group,
    Loader,
    Select,
    Skeleton,
    Stack,
    Text,
    TextInput,
    ThemeIcon,
    Title,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
    IconArrowForwardUp,
    IconClockHour4,
    IconMessage,
    IconSearch,
    IconStethoscope,
    IconTrash,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
    type ReferralSortDir,
    type ReferralRecord,
    type ReferralStatus,
    type ReferralsFilters,
    useDeleteManyReferralsMutation,
    useDeleteReferralMutation,
    useInvalidateReferrals,
    useReferralsInfiniteQuery,
} from "@/app/(portal)/user/_query";
import { confirmReferral } from "@/data/referrals/actions";
import { trackEvent } from "@/lib/analytics";
import { buildReferralContinuationMessage } from "@/lib/build-referral-continuation-message";
import { formatDate } from "@/lib/format";
import Link, { useLinkStatus } from "@/ui/link";
import { colors } from "@/ui/tokens";

const STATUS_COLOR: Record<ReferralStatus, string> = {
    pending: colors.warning,
    accepted: colors.success,
    dismissed: "gray",
    completed: "primary",
};

const STATUS_LABEL: Record<ReferralStatus, string> = {
    pending: "Awaiting action",
    accepted: "In progress",
    dismissed: "Dismissed",
    completed: "Completed",
};

const STATUS_EXPLANATION: Record<ReferralStatus, string> = {
    pending: "CareAI suggested a specialist follow-up, but you have not started that specialist discussion yet.",
    accepted: "You already started the specialist discussion, and the referral is currently active in your care flow.",
    dismissed: "This referral was reviewed and set aside. You can still revisit the original conversation if needed.",
    completed: "This referral has already been acted on and is now part of your care history.",
};

const FILTER_OPTIONS = [
    { label: "All", value: "" },
    { label: "Pending", value: "pending" },
    { label: "In progress", value: "accepted" },
    { label: "Completed", value: "completed" },
    { label: "Dismissed", value: "dismissed" },
];

const SORT_OPTIONS = [
    { label: "Newest", value: "desc" },
    { label: "Oldest", value: "asc" },
];

export interface ReferralsInitialFilters {
    status?: ReferralStatus;
    q?: string;
    sortDir?: ReferralSortDir;
}

interface ReferralActions {
    deletingId: string | null;
    isBulkDeleting: boolean;
    startingId: string | null;
    handleDeleteReferral: (referral: ReferralRecord) => void;
    handleDeleteSelected: (referrals: ReferralRecord[], onDeleted: (referralIds: string[]) => void) => void;
    handleStartDiscussion: (referral: ReferralRecord) => void;
}

interface ReferralDeleteAction {
    deletingId: string | null;
    isBulkDeleting: boolean;
    handleDeleteReferral: (referral: ReferralRecord) => void;
    handleDeleteSelected: (referrals: ReferralRecord[], onDeleted: (referralIds: string[]) => void) => void;
}

interface ReferralStartAction {
    handleStartDiscussion: (referral: ReferralRecord) => void;
    startingId: string | null;
}

interface ReferralSelection {
    allSelected: boolean;
    selectedCount: number;
    selectedIds: Set<string>;
    selectedReferrals: ReferralRecord[];
    selectIndeterminate: boolean;
    clearSelectedIds: (referralIds?: string[]) => void;
    handleToggleSelect: (referralId: string) => void;
    handleToggleSelectAll: () => void;
}

interface ReferralsHeaderProps {
    hasPendingReferrals: boolean;
    summary: string;
}

interface ReferralsFiltersBarProps {
    search: string;
    sortDir: ReferralSortDir;
    statusFilter: string;
    onSearchChange: (value: string) => void;
    onSortDirChange: (value: ReferralSortDir) => void;
    onStatusFilterChange: (value: string) => void;
}

interface ReferralsBulkActionsProps {
    allSelected: boolean;
    isBulkDeleting: boolean;
    selectIndeterminate: boolean;
    selectedCount: number;
    onDeleteSelected: () => void;
    onToggleSelectAll: () => void;
}

interface ReferralRowProps {
    referral: ReferralRecord;
    isSelected: boolean;
    isDeleting: boolean;
    isStarting: boolean;
    onDelete: (referral: ReferralRecord) => void;
    onStartDiscussion: (referral: ReferralRecord) => void;
    onToggleSelect: (referralId: string) => void;
}

interface ReferralRowHeaderProps {
    referral: ReferralRecord;
    isSelected: boolean;
    onToggleSelect: (referralId: string) => void;
}

interface ReferralRowDetailsProps {
    referral: ReferralRecord;
}

interface ReferralRowActionsProps {
    referral: ReferralRecord;
    canStart: boolean;
    isDeleting: boolean;
    isStarting: boolean;
    startDiscussionLabel: string;
    onDelete: (referral: ReferralRecord) => void;
    onStartDiscussion: (referral: ReferralRecord) => void;
}

interface ReferralsListProps {
    deletingId: string | null;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    isLoading: boolean;
    selectedIds: Set<string>;
    referrals: ReferralRecord[];
    search: string;
    statusFilter: string;
    startingId: string | null;
    onDeleteReferral: (referral: ReferralRecord) => void;
    onLoadMore: () => void;
    onStartDiscussion: (referral: ReferralRecord) => void;
    onToggleSelect: (referralId: string) => void;
}

function formatSpecialistName(specialist: string): string {
    const normalized = specialist.trim();
    if (normalized.length === 0) {
        return "specialist";
    }

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getReferralWhyItMatters(referral: ReferralRecord): string {
    const specialist = formatSpecialistName(referral.specialist);
    if (referral.reason) {
        return `A ${specialist} follow-up was suggested because ${referral.reason}.`;
    }

    return `A ${specialist} follow-up was suggested from your consultation history.`;
}

function getReferralSourceText(referral: ReferralRecord): string {
    if (referral.reportLabel) {
        return `Source: this referral was linked to ${referral.reportLabel}.`;
    }

    return "Source: this referral came from a previous conversation in your portal history.";
}

function getReferralNextStep(referral: ReferralRecord): string {
    const specialist = formatSpecialistName(referral.specialist);

    if (referral.status === "pending") {
        return `If this still matches how you feel, start the ${specialist} discussion so the portal can continue with more focused guidance.`;
    }

    if (referral.status === "accepted") {
        return `Continue the ${specialist} discussion to pick up where you left off and keep your care context together.`;
    }

    if (referral.status === "dismissed") {
        return "No action is required. If your symptoms change, revisit the original session and decide again with fresh context.";
    }

    return "You can review the linked session any time to understand what led to this follow-up and what happened next.";
}

function StatusBadge({ status }: Readonly<{ status: ReferralStatus }>) {
    return (
        <Badge size="xs" variant="light" color={STATUS_COLOR[status]} radius="sm">
            {STATUS_LABEL[status]}
        </Badge>
    );
}

function ReferralStatusLegend() {
    return (
        <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder radius="lg" p="md">
            <Stack gap="sm">
                <Stack gap={4}>
                    <Text fw={600} size="sm">
                        How to read referrals
                    </Text>
                    <Text size="sm" c="dimmed">
                        Referrals appear when the portal thinks a specialist conversation could help based on your symptoms,
                        assessment answers, or uploaded documents. Unlike a generic chat app, these suggestions stay tied to
                        your care history so you can come back later and continue with context.
                    </Text>
                </Stack>

                <Group gap="xs" wrap="wrap">
                    {Object.entries(STATUS_LABEL).map(([status, label]) => (
                        <Badge
                            key={status}
                            size="sm"
                            variant="light"
                            color={STATUS_COLOR[status as ReferralStatus]}
                            radius="sm"
                        >
                            {label}
                        </Badge>
                    ))}
                </Group>

                <Text size="xs" c="dimmed">
                    Referrals do not assign an urgency score on their own. Use the specialist suggestion, your recent
                    assessment results, and how you feel right now to decide how quickly to act.
                </Text>
            </Stack>
        </MotionCard>
    );
}

function OpenSessionIcon() {
    const { pending } = useLinkStatus();
    if (pending) {
        return <Loader size={12} />;
    }

    return <IconMessage size={14} />;
}

function ReferralRowHeader({
    referral,
    isSelected,
    onToggleSelect,
}: Readonly<ReferralRowHeaderProps>) {
    return (
        <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Group gap="sm" align="flex-start" wrap="nowrap">
                <Checkbox
                    checked={isSelected}
                    onChange={() => onToggleSelect(referral.id)}
                    aria-label={`Select referral for ${referral.specialist}`}
                    mt={2}
                    size="sm"
                    style={{ flexShrink: 0 }}
                />
                <ThemeIcon
                    size={36}
                    radius="md"
                    color={STATUS_COLOR[referral.status]}
                    variant="light"
                    style={{ flexShrink: 0 }}
                >
                    <IconStethoscope size={18} />
                </ThemeIcon>
                <Stack gap={2}>
                    <Group gap={6} align="center" wrap="wrap">
                        <Text fw={600} size="sm" style={{ textTransform: "capitalize" }}>
                            {referral.specialist}
                        </Text>
                        {referral.reportLabel ? (
                            <Badge size="xs" variant="outline" color="gray" radius="sm">
                                {referral.reportLabel}
                            </Badge>
                        ) : null}
                    </Group>
                    <Text size="xs" c="dimmed">{formatDate(referral.createdAt)}</Text>
                </Stack>
            </Group>
            <StatusBadge status={referral.status} />
        </Group>
    );
}

function ReferralRowDetails({ referral }: Readonly<ReferralRowDetailsProps>) {
    return (
        <Box p="sm" style={{ borderRadius: 8, border: "1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))", background: "light-dark(var(--mantine-color-gray-0), rgba(255, 255, 255, 0.02))" }}>
            <Stack gap="xs">
                <Box>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                        What this means
                    </Text>
                    <Text size="sm">{getReferralWhyItMatters(referral)}</Text>
                    <Text size="xs" c="dimmed" mt={4}>
                        {getReferralSourceText(referral)}
                    </Text>
                </Box>

                <Box>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                        What this status means
                    </Text>
                    <Text size="sm">{STATUS_EXPLANATION[referral.status]}</Text>
                </Box>

                <Box>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                        Suggested next step
                    </Text>
                    <Text size="sm">{getReferralNextStep(referral)}</Text>
                </Box>
            </Stack>
        </Box>
    );
}

function ReferralRowActions({
    referral,
    canStart,
    isDeleting,
    isStarting,
    startDiscussionLabel,
    onDelete,
    onStartDiscussion,
}: Readonly<ReferralRowActionsProps>) {
    return (
        <Group gap="xs" justify="flex-end" mt="xs">
            {canStart ? (
                <Button
                    size="xs"
                    variant="light"
                    color="primary"
                    leftSection={<IconArrowForwardUp size={14} />}
                    loading={isStarting}
                    disabled={isStarting}
                    onClick={() => onStartDiscussion(referral)}
                >
                    {startDiscussionLabel}
                </Button>
            ) : null}
            <Link href={`/user/assistant?id=${referral.sessionId}`}>
                <Button
                    size="xs"
                    variant="subtle"
                    color="gray"
                    leftSection={<OpenSessionIcon />}
                    onClick={() => {
                        trackEvent({
                            name: "health_record_viewed",
                            params: {
                                action: "open_linked_session",
                                surface: "referral_row",
                                session_id: referral.sessionId,
                                referral_id: referral.id,
                            },
                        });
                    }}
                >
                    Open linked session
                </Button>
            </Link>
            <Button
                size="xs"
                variant="subtle"
                color="red"
                leftSection={<IconTrash size={14} />}
                loading={isDeleting}
                onClick={() => onDelete(referral)}
            >
                Delete
            </Button>
        </Group>
    );
}

function ReferralRow({
    referral,
    isSelected,
    isDeleting,
    isStarting,
    onDelete,
    onStartDiscussion,
    onToggleSelect,
}: Readonly<ReferralRowProps>) {
    const isPending = referral.status === "pending";
    const isAccepted = referral.status === "accepted";
    const canStart = isPending || isAccepted;
    const startDiscussionLabel = isAccepted ? "Continue discussion" : "Start discussion";

    return (
        <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder radius="sm" p="sm">
            <Stack gap="xs">
                <ReferralRowHeader
                    referral={referral}
                    isSelected={isSelected}
                    onToggleSelect={onToggleSelect}
                />

                {referral.reason ? (
                    <Text size="sm" c="dimmed" lineClamp={2}>
                        {referral.reason}
                    </Text>
                ) : null}

                <ReferralRowDetails referral={referral} />

                <ReferralRowActions
                    referral={referral}
                    canStart={canStart}
                    isDeleting={isDeleting}
                    isStarting={isStarting}
                    startDiscussionLabel={startDiscussionLabel}
                    onDelete={onDelete}
                    onStartDiscussion={onStartDiscussion}
                />
            </Stack>
        </MotionCard>
    );
}

function ReferralsHeader({
    hasPendingReferrals,
    summary,
}: Readonly<ReferralsHeaderProps>) {
    return (
        <Group justify="space-between" align="flex-start">
            <Group gap="sm" align="center">
                <ThemeIcon size={36} radius="md" color="primary" variant="light">
                    <IconArrowForwardUp size={20} />
                </ThemeIcon>
                <Box>
                    <Title order={4}>Referrals</Title>
                    <Text size="xs" c="dimmed">{summary}</Text>
                </Box>
            </Group>
            {hasPendingReferrals ? (
                <Badge
                    size="sm"
                    variant="filled"
                    color={colors.warning}
                    leftSection={<IconClockHour4 size={10} />}
                >
                    Action needed
                </Badge>
            ) : null}
        </Group>
    );
}

function ReferralsFiltersBar({
    search,
    sortDir,
    statusFilter,
    onSearchChange,
    onSortDirChange,
    onStatusFilterChange,
}: Readonly<ReferralsFiltersBarProps>) {
    return (
        <>
            <Group justify="space-between" align="center" mt="md" mb="md" gap="md">
                <Group gap="sm" flex={1} wrap="nowrap">
                    <TextInput
                        placeholder="Search specialist..."
                        value={search}
                        onChange={(event) => onSearchChange(event.currentTarget.value)}
                        leftSection={<IconSearch size={16} />}
                        size="sm"
                        style={{ flex: 1, minWidth: 200, maxWidth: 350 }}
                    />
                    <Select
                        size="sm"
                        value={statusFilter}
                        onChange={(v) => onStatusFilterChange(v as string)}
                        data={FILTER_OPTIONS}
                        allowDeselect={false}
                        style={{ flexShrink: 0, width: 140 }}
                    />
                    <Select
                        size="sm"
                        value={sortDir}
                        onChange={(v) => onSortDirChange(v as ReferralSortDir)}
                        data={SORT_OPTIONS}
                        allowDeselect={false}
                        style={{ flexShrink: 0, width: 140 }}
                    />
                </Group>
            </Group>
        </>
    );
}

function ReferralsBulkActions({
    allSelected,
    isBulkDeleting,
    selectIndeterminate,
    selectedCount,
    onDeleteSelected,
    onToggleSelectAll,
}: Readonly<ReferralsBulkActionsProps>) {
    return (
        <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder radius="lg" p="sm">
            <Group justify="space-between" align="center" wrap="wrap" gap="xs">
                <Checkbox
                    checked={allSelected}
                    indeterminate={selectIndeterminate}
                    onChange={onToggleSelectAll}
                    label="Select all visible"
                    size="sm"
                />
                <Group gap="xs">
                    <Badge size="sm" variant="light" color="gray">
                        {selectedCount} selected
                    </Badge>
                    <Button
                        size="xs"
                        color="red"
                        leftSection={<IconTrash size={14} />}
                        disabled={selectedCount === 0 || isBulkDeleting}
                        loading={isBulkDeleting}
                        onClick={onDeleteSelected}
                    >
                        Delete selected
                    </Button>
                </Group>
            </Group>
        </MotionCard>
    );
}

function EmptyReferrals({ filtered }: Readonly<{ filtered: boolean }>) {
    return (
        <Stack align="center" gap="xs" py="xl">
            <ThemeIcon size={48} radius="xl" variant="light" color="gray">
                <IconArrowForwardUp size={24} />
            </ThemeIcon>
            <Text fw={500} c="dimmed" ta="center">
                {filtered ? "No referrals match this filter" : "No referrals yet"}
            </Text>
            <Text size="sm" c="dimmed" ta="center" maw={420}>
                {filtered
                    ? "Try a different search term or status filter."
                    : "When CareAI detects that specialist follow-up may help, referrals are saved here with status and linked context from your sessions."}
            </Text>
            {filtered ? null : (
                <Button
                    component={Link}
                    href="/user/assistant"
                    variant="light"
                    color="primary"
                    mt="sm"
                >
                    Start a consultation
                </Button>
            )}
        </Stack>
    );
}

function ReferralsList({
    deletingId,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    selectedIds,
    referrals,
    search,
    statusFilter,
    startingId,
    onDeleteReferral,
    onLoadMore,
    onStartDiscussion,
    onToggleSelect,
}: Readonly<ReferralsListProps>) {
    if (isLoading) {
        return (
            <Stack gap="md">
                <Skeleton height={96} radius="md" />
                <Skeleton height={96} radius="md" />
                <Skeleton height={96} radius="md" />
            </Stack>
        );
    }

    if (referrals.length === 0) {
        return <EmptyReferrals filtered={statusFilter.length > 0 || search.trim().length > 0} />;
    }

    return (
        <Stack gap="md">
            {referrals.map((referral) => (
                <ReferralRow
                    key={referral.id}
                    referral={referral}
                    isSelected={selectedIds.has(referral.id)}
                    isDeleting={deletingId === referral.id}
                    isStarting={startingId === referral.id}
                    onDelete={onDeleteReferral}
                    onStartDiscussion={onStartDiscussion}
                    onToggleSelect={onToggleSelect}
                />
            ))}

            {hasNextPage ? (
                <Button
                    variant="subtle"
                    color="gray"
                    size="sm"
                    loading={isFetchingNextPage}
                    onClick={onLoadMore}
                >
                    Load more
                </Button>
            ) : null}
        </Stack>
    );
}

function useReferralStartAction(): ReferralStartAction {
    const router = useRouter();
    const invalidateReferrals = useInvalidateReferrals();
    const [startingId, setStartingId] = useState<string | null>(null);

    async function startDiscussion(referral: ReferralRecord): Promise<void> {
        setStartingId(referral.id);
        try {
            const result = await confirmReferral(
                referral.sessionId,
                referral.specialist,
                referral.reason,
                referral.reportLabel,
            );

            if (!result.ok) {
                notifications.show({
                    title: "Error",
                    message: result.error ?? "Could not start the specialist discussion. Please try again.",
                    color: colors.danger,
                });
                return;
            }

            trackEvent({
                name: "encounter_escalated",
                params: {
                    reason: referral.reason || undefined,
                    agent_type: referral.specialist,
                    session_id: referral.sessionId,
                },
            });

            notifications.show({
                title: "Confirmed",
                message: `Connecting to ${referral.specialist} specialist...`,
                color: colors.success,
            });

            await invalidateReferrals();

            const params = new URLSearchParams({
                id: referral.sessionId,
                message: buildReferralContinuationMessage(
                    referral.specialist,
                    referral.reason,
                    referral.reportLabel,
                ),
            });

            router.push(`/user/assistant?${params.toString()}`);
        } catch {
            notifications.show({
                title: "Error",
                message: "Could not start the specialist discussion. Please try again.",
                color: colors.danger,
            });
        } finally {
            setStartingId(null);
        }
    }

    return {
        startingId,
        handleStartDiscussion(referral) {
            modals.openConfirmModal({
                title: `Start ${referral.specialist} consultation`,
                children: (
                    <Text size="sm">
                        This will open a new specialist discussion with the{" "}
                        <Text span fw={600} style={{ textTransform: "capitalize" }}>
                            {referral.specialist}
                        </Text>{" "}
                        agent. The session from your original referral will remain in your history.
                    </Text>
                ),
                labels: { confirm: "Start discussion", cancel: "Cancel" },
                confirmProps: { color: "primary" },
                onConfirm: () => {
                    startDiscussion(referral).catch(() => undefined);
                },
            });
        },
    };
}

function useReferralDeleteAction(): ReferralDeleteAction {
    const deleteReferral = useDeleteReferralMutation();
    const deleteManyReferrals = useDeleteManyReferralsMutation();
    const [deletingId, setDeletingId] = useState<string | null>(null);

    async function deleteReferralRecord(referralId: string): Promise<void> {
        setDeletingId(referralId);
        try {
            await deleteReferral.mutateAsync(referralId);
        } finally {
            setDeletingId(null);
        }
    }

    return {
        deletingId,
        isBulkDeleting: deleteManyReferrals.isPending,
        handleDeleteReferral(referral) {
            modals.openConfirmModal({
                title: "Delete referral",
                children: (
                    <Text size="sm">
                        This will permanently remove the referral to the{" "}
                        <Text span fw={600} style={{ textTransform: "capitalize" }}>
                            {referral.specialist}
                        </Text>{" "}
                        specialist from this list. Your conversation history will stay intact.
                    </Text>
                ),
                labels: { confirm: "Delete referral", cancel: "Cancel" },
                confirmProps: { color: "red" },
                onConfirm: () => {
                    deleteReferralRecord(referral.id).catch(() => undefined);
                },
            });
        },
        handleDeleteSelected(referrals, onDeleted) {
            const referralIds = referrals.map((referral) => referral.id);
            const count = referralIds.length;
            if (count === 0) {
                return;
            }

            modals.openConfirmModal({
                title: `Delete ${count} ${count === 1 ? "referral" : "referrals"}`,
                children: (
                    <Text size="sm">
                        The selected referrals will be removed from this list. Your conversation history will stay intact.
                    </Text>
                ),
                labels: { confirm: "Delete selected", cancel: "Cancel" },
                confirmProps: { color: "red" },
                onConfirm: () => {
                    deleteManyReferrals
                        .mutateAsync(referralIds)
                        .then(() => {
                            onDeleted(referralIds);
                        })
                        .catch(() => undefined);
                },
            });
        },
    };
}

function useReferralActions(): ReferralActions {
    const {
        deletingId,
        isBulkDeleting,
        handleDeleteReferral,
        handleDeleteSelected,
    } = useReferralDeleteAction();
    const { handleStartDiscussion, startingId } = useReferralStartAction();

    return {
        deletingId,
        isBulkDeleting,
        startingId,
        handleDeleteReferral,
        handleDeleteSelected,
        handleStartDiscussion,
    };
}

function useReferralSelection(referrals: ReferralRecord[]): ReferralSelection {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const allVisibleIds = referrals.map((referral) => referral.id);
    const selectedVisibleIds = allVisibleIds.filter((referralId) => selectedIds.has(referralId));
    const selectedReferrals = referrals.filter((referral) => selectedIds.has(referral.id));
    const selectedCount = selectedVisibleIds.length;
    const allSelected = allVisibleIds.length > 0 && selectedCount === allVisibleIds.length;
    const selectIndeterminate = selectedCount > 0 && selectedCount < allVisibleIds.length;

    return {
        allSelected,
        selectedCount,
        selectedIds,
        selectedReferrals,
        selectIndeterminate,
        clearSelectedIds(referralIds) {
            if (referralIds === undefined) {
                setSelectedIds(new Set());
                return;
            }

            setSelectedIds((current) => {
                const next = new Set(current);
                referralIds.forEach((referralId) => {
                    next.delete(referralId);
                });
                return next;
            });
        },
        handleToggleSelect(referralId) {
            setSelectedIds((current) => {
                const next = new Set(current);
                if (next.has(referralId)) {
                    next.delete(referralId);
                } else {
                    next.add(referralId);
                }
                return next;
            });
        },
        handleToggleSelectAll() {
            if (allSelected) {
                setSelectedIds(new Set());
                return;
            }

            setSelectedIds(new Set(allVisibleIds));
        },
    };
}

export function ReferralsContent({
    initialFilters,
}: Readonly<{ initialFilters?: ReferralsInitialFilters }>) {
    const [statusFilter, setStatusFilter] = useState<string>(initialFilters?.status ?? "");
    const [search, setSearch] = useState(initialFilters?.q ?? "");
    const [sortDir, setSortDir] = useState<ReferralSortDir>(initialFilters?.sortDir ?? "desc");
    const [debouncedSearch] = useDebouncedValue(search, 300);
    const {
        deletingId,
        isBulkDeleting,
        startingId,
        handleDeleteReferral,
        handleDeleteSelected,
        handleStartDiscussion,
    } = useReferralActions();

    const filters: ReferralsFilters = statusFilter
        ? {
            status: statusFilter as ReferralStatus,
            q: debouncedSearch.trim() || undefined,
            sortDir,
        }
        : {
            q: debouncedSearch.trim() || undefined,
            sortDir,
        };

    const {
        data,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
    } = useReferralsInfiniteQuery(filters);

    const referrals = data?.pages.flatMap((page) => page.referrals) ?? [];
    const totalCount = data?.pages[0]?.totalCount;
    const {
        allSelected,
        selectedCount,
        selectedIds,
        selectedReferrals,
        selectIndeterminate,
        clearSelectedIds,
        handleToggleSelect,
        handleToggleSelectAll,
    } = useReferralSelection(referrals);

    const hasPendingReferrals = referrals.some((referral) => referral.status === "pending");
    let referralsSummary = "Specialist follow-ups connected to your consultation history";
    if (totalCount !== undefined) {
        const referralLabel = totalCount === 1 ? "referral" : "referrals";
        referralsSummary = `${totalCount} ${referralLabel} tracked across your sessions`;
    }

    return (
        <Container pt="md" pb="xl">
            <Stack gap="md">
                <ReferralsHeader
                    hasPendingReferrals={hasPendingReferrals}
                    summary={referralsSummary}
                />

                <ReferralStatusLegend />

                <ReferralsFiltersBar
                    search={search}
                    sortDir={sortDir}
                    statusFilter={statusFilter}
                    onSearchChange={setSearch}
                    onSortDirChange={setSortDir}
                    onStatusFilterChange={setStatusFilter}
                />

                {referrals.length > 0 ? (
                    <ReferralsBulkActions
                        allSelected={allSelected}
                        isBulkDeleting={isBulkDeleting}
                        selectIndeterminate={selectIndeterminate}
                        selectedCount={selectedCount}
                        onDeleteSelected={() => handleDeleteSelected(selectedReferrals, clearSelectedIds)}
                        onToggleSelectAll={handleToggleSelectAll}
                    />
                ) : null}

                <ReferralsList
                    deletingId={deletingId}
                    hasNextPage={hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                    isLoading={isLoading}
                    selectedIds={selectedIds}
                    referrals={referrals}
                    search={search}
                    statusFilter={statusFilter}
                    startingId={startingId}
                    onDeleteReferral={handleDeleteReferral}
                    onLoadMore={() => fetchNextPage().catch(() => undefined)}
                    onStartDiscussion={handleStartDiscussion}
                    onToggleSelect={handleToggleSelect}
                />
            </Stack>
        </Container>
    );
}
