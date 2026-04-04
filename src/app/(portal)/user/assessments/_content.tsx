"use client";
import { MotionCard } from "@/ui/components/motion-card";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Container,
    Group,
    Loader,
    ScrollArea,
    SegmentedControl,
    Skeleton,
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
    IconCheck,
    IconClipboardHeart,
    IconHeartHandshake,
    IconMessage,
    IconMessageQuestion,
    IconSearch,
    IconSortAscending,
    IconSortDescending,
    IconTrash,
    IconX,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";

import Link, { useLinkStatus } from "@/ui/link";
import {
    useAssessmentsInfiniteQuery,
    useDeleteAssessmentMutation,
    type AssessmentRecord,
} from "@/app/(portal)/user/_query";
import { colors } from "@/ui/tokens";
import { formatDate } from "@/lib/format";

type SortField = "date" | "title" | "qa";

type AssessmentRisk = NonNullable<AssessmentRecord["riskLevel"]>;

const RISK_COLOR: Record<AssessmentRisk, string> = {
    low: colors.success,
    moderate: colors.warning,
    high: colors.danger,
    emergency: colors.danger,
};

function sortAssessments(
    assessments: readonly AssessmentRecord[],
    field: SortField,
    asc: boolean,
): AssessmentRecord[] {
    const sorted = [...assessments];
    sorted.sort((a, b) => {
        if (field === "title") return a.title.localeCompare(b.title);
        if (field === "qa") return a.qa.length - b.qa.length;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    return asc ? sorted : sorted.reverse();
}

function getAssessmentGuidelines(assessment: AssessmentRecord): string[] {
    if (assessment.guidelinesFollowed?.length) {
        return assessment.guidelinesFollowed;
    }
    if (assessment.guideline) {
        return [assessment.guideline];
    }
    return [];
}

function getDeleteFailureMessage(error: unknown, title: string): string {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }
    return `Could not delete ${title}. Please try again.`;
}

function OpenSessionIcon() {
    const { pending } = useLinkStatus();
    if (pending) return <Loader size={12} />;
    return <IconMessage size={14} />;
}

function AssessmentMetaRow({
    assessment,
    guidelines,
}: Readonly<{ assessment: AssessmentRecord; guidelines: string[] }>) {
    const riskColor = assessment.riskLevel
        ? RISK_COLOR[assessment.riskLevel]
        : "primary";
    const actionCardsCount = assessment.actionCards?.length ?? 0;

    return (
        <Group gap={6} mt={4} wrap="wrap">
            {assessment.riskLevel ? (
                <Badge size="xs" variant="light" color={riskColor} radius="sm">
                    {assessment.riskLevel} risk
                </Badge>
            ) : null}
            {assessment.condition ? (
                <Badge size="xs" variant="outline" color="gray" radius="sm">
                    {assessment.condition}
                </Badge>
            ) : null}
            {assessment.specialtyAgent ? (
                <Badge size="xs" variant="light" color="primary" radius="sm">
                    {assessment.specialtyAgent}
                </Badge>
            ) : null}
            {guidelines.length > 0 ? (
                <Badge size="xs" variant="light" color="indigo" radius="sm">
                    {guidelines.length} guideline{guidelines.length === 1 ? "" : "s"}
                </Badge>
            ) : null}
            {actionCardsCount > 0 ? (
                <Badge size="xs" variant="light" color="teal" radius="sm">
                    {actionCardsCount} action card{actionCardsCount === 1 ? "" : "s"}
                </Badge>
            ) : null}
            <Badge size="xs" variant="light" color="gray" radius="sm">
                {assessment.qa.length} Q&amp;A
            </Badge>
            <Text size="xs" c="dimmed">
                {formatDate(assessment.createdAt)}
            </Text>
        </Group>
    );
}

function AssessmentCard({
    assessment,
    isPendingDelete,
    onDelete,
}: Readonly<{
    assessment: AssessmentRecord;
    isPendingDelete: boolean;
    onDelete: () => void;
}>) {
    const router = useRouter();
    const riskColor = assessment.riskLevel
        ? RISK_COLOR[assessment.riskLevel]
        : "primary";
    const guidelines = getAssessmentGuidelines(assessment);

    const openDetails = () => {
        router.push(`/user/assessments/${assessment.id}`);
    };

    const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openDetails();
        }
    };

    return (
        <MotionCard interactive blobColor="var(--mantine-color-primary-6)"
            withBorder
            radius="lg"
            p="md"
            onClick={openDetails}
            onKeyDown={handleCardKeyDown}
            role="button"
            tabIndex={0}
            aria-label={`Open assessment ${assessment.title}`}
            style={{
                opacity: isPendingDelete ? 0.4 : 1,
                transition: "opacity 150ms ease",
                cursor: "pointer",
            }}
        >
            <Group justify="space-between" wrap="nowrap" gap="sm" align="flex-start">
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }} align="flex-start">
                    <ThemeIcon
                        size={36}
                        radius="md"
                        color={riskColor}
                        variant="light"
                        style={{ flexShrink: 0, marginTop: 2 }}
                    >
                        <IconClipboardHeart size={18} />
                    </ThemeIcon>
                    <Box style={{ minWidth: 0 }}>
                        <Text fw={600} size="sm" lineClamp={2}>
                            {assessment.title}
                        </Text>
                        <AssessmentMetaRow assessment={assessment} guidelines={guidelines} />
                    </Box>
                </Group>

                <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }} align="center">
                    <Tooltip label="Open session" withArrow>
                        <ActionIcon
                            size={28}
                            variant="subtle"
                            color="gray"
                            component={Link}
                            href={`/user/assistant?id=${assessment.sessionId}`}
                            onClick={(event) => event.stopPropagation()}
                            aria-label="Open source session"
                        >
                            <OpenSessionIcon />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Delete" withArrow>
                        <ActionIcon
                            size={28}
                            variant="subtle"
                            color="red"
                            onClick={(event) => {
                                event.stopPropagation();
                                onDelete();
                            }}
                            disabled={isPendingDelete}
                            aria-label="Delete assessment"
                        >
                            <IconTrash size={14} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>
        </MotionCard>
    );
}

function AssessmentSkeletons() {
    return (
        <Stack gap="sm">
            {["sk-a", "sk-b", "sk-c"].map((k) => (
                <Skeleton key={k} height={88} radius="lg" />
            ))}
        </Stack>
    );
}

function EmptyState({ hasFilters }: Readonly<{ hasFilters: boolean }>) {
    if (hasFilters) {
        return (
            <Box py={80} style={{ textAlign: "center" }}>
                <Text size="sm" c="dimmed" maw={360} mx="auto" lh={1.6}>
                    No assessments match your current search and filters.
                </Text>
            </Box>
        );
    }

    return (
        <Box py={80} style={{ textAlign: "center" }}>
            <ThemeIcon size={64} radius="xl" color="gray" variant="light" mx="auto" mb="md">
                <IconMessageQuestion size={32} />
            </ThemeIcon>
            <Text size="sm" c="dimmed" maw={320} mx="auto" lh={1.6}>
                No assessments saved yet. Start a clinical assessment chat and the AI will
                automatically save your Q&amp;A here.
            </Text>
            <Button
                mt="lg"
                component={Link}
                href="/user/assistant?message=Start%20a%20clinical%20assessment"
                leftSection={<IconHeartHandshake size={16} />}
            >
                Start assessment
            </Button>
        </Box>
    );
}

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
        <Group justify="center" mt="lg" ref={ref}>
            {isFetchingNextPage ? <Loader size="sm" /> : null}
        </Group>
    );
}

export function AssessmentsContent() {
    const [search, setSearch] = useState("");
    const [debouncedSearch] = useDebouncedValue(search, 300);
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed" | "abandoned">("all");
    const [riskFilter, setRiskFilter] = useState<"all" | "low" | "moderate" | "high" | "emergency">("all");
    const [sortField, setSortField] = useState<SortField>("date");
    const [sortAsc, setSortAsc] = useState(false);

    const status = statusFilter === "all" ? undefined : statusFilter;
    const riskLevel = riskFilter === "all" ? undefined : riskFilter;

    const {
        data,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useAssessmentsInfiniteQuery({
        q: debouncedSearch || undefined,
        status,
        riskLevel,
    });

    const assessments = sortAssessments(
        data?.pages.flatMap((p) => p.assessments) ?? [],
        sortField,
        sortAsc,
    );

    const totalCount = data?.pages[0]?.totalCount;

    const deleteAssessment = useDeleteAssessmentMutation();

    const hasFilters = !!debouncedSearch || !!status || !!riskLevel;

    function handleDelete(id: string, title: string) {
        modals.openConfirmModal({
            title: "Delete assessment?",
            children: (
                <Text size="sm">
                    <strong>{title}</strong> will be permanently deleted. This cannot be undone.
                </Text>
            ),
            labels: { confirm: "Delete", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => {
                deleteAssessment.mutate(id, {
                    onSuccess: () =>
                        notifications.show({
                            title: "Assessment deleted",
                            message: `${title} has been removed.`,
                            color: colors.success,
                            icon: <IconCheck size={16} />,
                        }),
                    onError: (error) =>
                        notifications.show({
                            title: "Delete failed",
                            message: getDeleteFailureMessage(error, title),
                            color: colors.danger,
                        }),
                });
            },
        });
    }

    return (
        <Container pt="md">
            <Stack>
                <Group justify="space-between" align="center">
                    <Group gap="sm" wrap="nowrap">
                        <ThemeIcon size={36} radius="md" color="primary" variant="light">
                            <IconClipboardHeart size={20} />
                        </ThemeIcon>
                        <Box>
                            <Title order={4} lh={1.2}>
                                My Assessments
                            </Title>
                            <Text size="xs" c="dimmed">
                                Search, filter, and review complete assessment details
                            </Text>
                        </Box>
                    </Group>
                    <Group gap="sm" align="center">
                        {!isLoading && totalCount != null && totalCount > 0 ? (
                            <Badge variant="light" color="gray" size="sm" radius="xl">
                                {totalCount} assessment{totalCount === 1 ? "" : "s"}
                            </Badge>
                        ) : null}
                        <Button
                            size="xs"
                            component={Link}
                            href="/user/assistant?message=Start%20a%20clinical%20assessment"
                            leftSection={<IconHeartHandshake size={14} />}
                        >
                            Start assessment
                        </Button>
                    </Group>
                </Group>

                <Group gap="sm" wrap="wrap">
                    <TextInput
                        placeholder="Search assessments…"
                        leftSection={<IconSearch size={16} />}
                        rightSection={
                            search ? (
                                <IconX
                                    size={14}
                                    style={{ cursor: "pointer" }}
                                    onClick={() => setSearch("")}
                                />
                            ) : undefined
                        }
                        size="sm"
                        value={search}
                        onChange={(event) => setSearch(event.currentTarget.value)}
                        style={{ flex: 1, minWidth: 180 }}
                    />

                    <SegmentedControl
                        size="xs"
                        value={statusFilter}
                        onChange={(v) =>
                            setStatusFilter(v as "all" | "active" | "completed" | "abandoned")
                        }
                        data={[
                            { label: "All", value: "all" },
                            { label: "Active", value: "active" },
                            { label: "Completed", value: "completed" },
                            { label: "Abandoned", value: "abandoned" },
                        ]}
                    />

                    <SegmentedControl
                        size="xs"
                        value={riskFilter}
                        onChange={(v) =>
                            setRiskFilter(v as "all" | "low" | "moderate" | "high" | "emergency")
                        }
                        data={[
                            { label: "All risk", value: "all" },
                            { label: "Low", value: "low" },
                            { label: "Moderate", value: "moderate" },
                            { label: "High", value: "high" },
                            { label: "Emergency", value: "emergency" },
                        ]}
                    />
                </Group>

                <Group gap="xs">
                    <SegmentedControl
                        size="xs"
                        value={sortField}
                        onChange={(v) => setSortField(v as SortField)}
                        data={[
                            { label: "Date", value: "date" },
                            { label: "Title", value: "title" },
                            { label: "Q&A", value: "qa" },
                        ]}
                    />
                    <Box
                        component="button"
                        onClick={() => setSortAsc((prev) => !prev)}
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
                        {sortAsc ? "Asc" : "Desc"}
                    </Box>
                </Group>

                <Box style={{ flex: 1, overflow: "hidden" }}>
                    <ScrollArea style={{ height: "100%" }}>
                        <Box maw={1080} mx="auto">
                            {isLoading ? <AssessmentSkeletons /> : null}

                            {!isLoading && assessments.length === 0 ? <EmptyState hasFilters={hasFilters} /> : null}

                            {!isLoading && assessments.length > 0 ? (
                                <Stack gap="sm">
                                    {assessments.map((assessment) => (
                                        <AssessmentCard
                                            key={assessment.id}
                                            assessment={assessment}
                                            isPendingDelete={
                                                deleteAssessment.isPending &&
                                                deleteAssessment.variables === assessment.id
                                            }
                                            onDelete={() => handleDelete(assessment.id, assessment.title)}
                                        />
                                    ))}

                                    <LazyLoadSentinel
                                        hasNextPage={!!hasNextPage}
                                        isFetchingNextPage={isFetchingNextPage}
                                        fetchNextPage={fetchNextPage}
                                    />
                                </Stack>
                            ) : null}
                        </Box>
                    </ScrollArea>
                </Box>
            </Stack>
        </Container>
    );
}
