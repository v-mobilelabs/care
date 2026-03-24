"use client";

import {
    Badge,
    Box,
    Button,
    Container,
    Group,
    Loader,
    Paper,
    SegmentedControl,
    Skeleton,
    Stack,
    Text,
    ThemeIcon,
    Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import {
    IconArrowForwardUp,
    IconCheck,
    IconClockHour4,
    IconMessage,
    IconStethoscope,
    IconX,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
    useReferralsInfiniteQuery,
    useInvalidateReferrals,
    type ReferralRecord,
    type ReferralStatus,
    type ReferralsFilters,
} from "@/app/(portal)/patient/_query";
import { colors } from "@/ui/tokens";
import { formatDate } from "@/lib/format";
import Link, { useLinkStatus } from "@/ui/link";

// ── Status display helpers ────────────────────────────────────────────────────

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

function StatusBadge({ status }: Readonly<{ status: ReferralStatus }>) {
    return (
        <Badge size="xs" variant="light" color={STATUS_COLOR[status]} radius="sm">
            {STATUS_LABEL[status]}
        </Badge>
    );
}

// ── Open-session link icon ────────────────────────────────────────────────────

function OpenSessionIcon() {
    const { pending } = useLinkStatus();
    if (pending) return <Loader size={12} />;
    return <IconMessage size={14} />;
}

// ── Referral row card ─────────────────────────────────────────────────────────

interface ReferralRowProps {
    referral: ReferralRecord;
    onStartDiscussion: (referral: ReferralRecord) => void;
    isStarting: boolean;
}

function ReferralRow({
    referral,
    onStartDiscussion,
    isStarting,
}: Readonly<ReferralRowProps>) {
    const isPending = referral.status === "pending";
    const isAccepted = referral.status === "accepted";
    const canStart = isPending || isAccepted;

    return (
        <Paper withBorder radius="lg" p="md">
            <Stack gap="xs">
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Group gap="sm" align="flex-start" wrap="nowrap">
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

                {referral.reason ? (
                    <Text size="sm" c="dimmed" lineClamp={2}>
                        {referral.reason}
                    </Text>
                ) : null}

                <Group gap="xs">
                    {canStart ? (
                        <Button
                            size="xs"
                            variant="light"
                            color="primary"
                            leftSection={<IconArrowForwardUp size={14} />}
                            loading={isStarting}
                            onClick={() => onStartDiscussion(referral)}
                        >
                            Start discussion
                        </Button>
                    ) : null}
                    <Link href={`/patient/assistant?session=${referral.sessionId}`}>
                        <Button
                            size="xs"
                            variant="subtle"
                            color="gray"
                            leftSection={<OpenSessionIcon />}
                        >
                            View session
                        </Button>
                    </Link>
                </Group>
            </Stack>
        </Paper>
    );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyReferrals({ filtered }: Readonly<{ filtered: boolean }>) {
    return (
        <Stack align="center" gap="xs" py="xl">
            <ThemeIcon size={48} radius="xl" variant="light" color="gray">
                <IconArrowForwardUp size={24} />
            </ThemeIcon>
            <Text fw={500} c="dimmed" ta="center">
                {filtered ? "No referrals match this filter" : "No referrals yet"}
            </Text>
            <Text size="sm" c="dimmed" ta="center" maw={320}>
                {filtered
                    ? "Try a different status filter."
                    : "When a specialist referral is issued during a consultation, it will appear here."}
            </Text>
        </Stack>
    );
}

// ── Filter bar ────────────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
    { label: "All", value: "" },
    { label: "Pending", value: "pending" },
    { label: "In progress", value: "accepted" },
    { label: "Completed", value: "completed" },
    { label: "Dismissed", value: "dismissed" },
];

// ── Main content ──────────────────────────────────────────────────────────────

export function ReferralsContent() {
    const router = useRouter();
    const invalidateReferrals = useInvalidateReferrals();
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [startingId, setStartingId] = useState<string | null>(null);

    const filters: ReferralsFilters = statusFilter
        ? { status: statusFilter as ReferralStatus }
        : {};

    const {
        data,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
    } = useReferralsInfiniteQuery(filters);

    const referrals = data?.pages.flatMap((p) => p.referrals) ?? [];
    const totalCount = data?.pages[0]?.totalCount;

    function handleStartDiscussion(referral: ReferralRecord) {
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
            onConfirm: async () => {
                setStartingId(referral.id);
                try {
                    // Navigate to assistant — the session already has the specialist agent set
                    router.push(`/patient/assistant?session=${referral.sessionId}`);
                    await invalidateReferrals();
                } catch {
                    notifications.show({
                        title: "Error",
                        message: "Could not open the session. Please try again.",
                        color: colors.danger,
                    });
                } finally {
                    setStartingId(null);
                }
            },
        });
    }

    return (
        <Container pt="md" pb="xl">
            <Stack gap="md">
                {/* Header */}
                <Group justify="space-between" align="flex-start">
                    <Group gap="sm" align="center">
                        <ThemeIcon size={36} radius="md" color="primary" variant="light">
                            <IconArrowForwardUp size={20} />
                        </ThemeIcon>
                        <Box>
                            <Title order={4}>Referrals</Title>
                            <Text size="xs" c="dimmed">
                                {totalCount !== undefined
                                    ? `${totalCount} referral${totalCount === 1 ? "" : "s"}`
                                    : "Your specialist referrals"}
                            </Text>
                        </Box>
                    </Group>
                    {referrals.some((r) => r.status === "pending") ? (
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

                {/* Status filter */}
                <SegmentedControl
                    data={FILTER_OPTIONS}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    size="xs"
                    radius="lg"
                    fullWidth
                />

                {/* List */}
                {isLoading ? (
                    <Stack gap="md">
                        <Skeleton height={96} radius="md" />
                        <Skeleton height={96} radius="md" />
                        <Skeleton height={96} radius="md" />
                    </Stack>
                ) : referrals.length === 0 ? (
                    <EmptyReferrals filtered={!!statusFilter} />
                ) : (
                    <Stack gap="md">
                        {referrals.map((referral) => (
                            <ReferralRow
                                key={referral.id}
                                referral={referral}
                                onStartDiscussion={handleStartDiscussion}
                                isStarting={startingId === referral.id}
                            />
                        ))}

                        {hasNextPage ? (
                            <Button
                                variant="subtle"
                                color="gray"
                                size="sm"
                                loading={isFetchingNextPage}
                                onClick={() => void fetchNextPage()}
                            >
                                Load more
                            </Button>
                        ) : null}
                    </Stack>
                )}
            </Stack>
        </Container>
    );
}
