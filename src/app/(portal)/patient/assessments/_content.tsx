"use client";
import {
    ActionIcon,
    Badge,
    Box,
    Card,
    Collapse,
    Container,
    Divider,
    Group,
    Paper,
    ScrollArea,
    Skeleton,
    Stack,
    Text,
    ThemeIcon,
    Title,
    Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
    IconCheck,
    IconChevronDown,
    IconChevronRight,
    IconClipboardHeart,
    IconMessage,
    IconMessageQuestion,
    IconTrash,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
    useAssessmentsQuery,
    useDeleteAssessmentMutation,
    type AssessmentRecord,
    type QaPair,
} from "@/app/(portal)/patient/_query";
import { colors } from "@/ui/tokens";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

const RISK_COLOR: Record<
    NonNullable<AssessmentRecord["riskLevel"]>,
    string
> = {
    low: colors.success,
    moderate: colors.warning,
    high: colors.danger,
    emergency: colors.danger,
};

// ── Q&A pair display ──────────────────────────────────────────────────────────

function QaItem({ pair, index }: Readonly<{ pair: QaPair; index: number }>) {
    return (
        <Box>
            <Group gap={6} mb={4} wrap="nowrap" align="flex-start">
                <ThemeIcon
                    size={18}
                    radius="xl"
                    color="primary"
                    variant="light"
                    style={{ flexShrink: 0, marginTop: 2 }}
                >
                    <Text size="9px" fw={700}>{index + 1}</Text>
                </ThemeIcon>
                <Text size="sm" fw={500} lh={1.5}>
                    {pair.question}
                </Text>
            </Group>
            {pair.options && pair.options.length > 0 && (
                <Group gap={4} ml={26} mb={4} wrap="wrap">
                    {pair.options.map((opt) => (
                        <Badge
                            key={opt}
                            size="xs"
                            variant={pair.answer === opt || pair.answer.includes(opt) ? "filled" : "outline"}
                            color={pair.answer === opt || pair.answer.includes(opt) ? "primary" : "gray"}
                            radius="sm"
                        >
                            {opt}
                        </Badge>
                    ))}
                </Group>
            )}
            <Group gap={6} ml={26} wrap="nowrap" align="flex-start">
                <IconCheck size={13} color="var(--mantine-color-teal-6)" style={{ marginTop: 3, flexShrink: 0 }} />
                <Text size="sm" c="dimmed" lh={1.5}>
                    {pair.answer}
                </Text>
            </Group>
        </Box>
    );
}

// ── Assessment card ───────────────────────────────────────────────────────────

function AssessmentCard({
    assessment,
    isPendingDelete,
    onDelete,
}: Readonly<{
    assessment: AssessmentRecord;
    isPendingDelete: boolean;
    onDelete: () => void;
}>) {
    const [expanded, { toggle }] = useDisclosure(false);
    const router = useRouter();
    const [, startTransition] = useTransition();

    return (
        <Paper
            withBorder
            radius="lg"
            p="md"
            style={{
                opacity: isPendingDelete ? 0.4 : 1,
                transition: "opacity 150ms ease",
            }}
        >
            <Group justify="space-between" wrap="nowrap" gap="sm" align="flex-start">
                {/* Left: icon + title + badges */}
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }} align="flex-start">
                    <ThemeIcon
                        size={36}
                        radius="md"
                        color={
                            assessment.riskLevel
                                ? RISK_COLOR[assessment.riskLevel]
                                : "primary"
                        }
                        variant="light"
                        style={{ flexShrink: 0, marginTop: 2 }}
                    >
                        <IconClipboardHeart size={18} />
                    </ThemeIcon>
                    <Box style={{ minWidth: 0 }}>
                        <Text fw={600} size="sm" lineClamp={2}>
                            {assessment.title}
                        </Text>
                        <Group gap={6} mt={4} wrap="wrap">
                            {assessment.riskLevel && (
                                <Badge
                                    size="xs"
                                    variant="light"
                                    color={RISK_COLOR[assessment.riskLevel]}
                                    radius="sm"
                                >
                                    {assessment.riskLevel} risk
                                </Badge>
                            )}
                            {assessment.condition && (
                                <Badge size="xs" variant="outline" color="gray" radius="sm">
                                    {assessment.condition}
                                </Badge>
                            )}
                            <Badge size="xs" variant="light" color="gray" radius="sm">
                                {assessment.qa.length} Q&amp;A
                            </Badge>
                            <Text size="xs" c="dimmed">
                                {formatDate(assessment.createdAt)}
                            </Text>
                        </Group>
                    </Box>
                </Group>

                {/* Right: actions */}
                <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }} align="center">
                    <Tooltip label="Open session" withArrow>
                        <ActionIcon
                            size={28}
                            variant="subtle"
                            color="gray"
                            onClick={() =>
                                startTransition(() =>
                                    router.push(`/patient/assistant?id=${assessment.sessionId}`)
                                )
                            }
                            aria-label="Open source session"
                        >
                            <IconMessage size={14} />
                        </ActionIcon>
                    </Tooltip>
                    <ActionIcon
                        size={28}
                        variant="subtle"
                        color="gray"
                        onClick={toggle}
                        aria-label={expanded ? "Collapse" : "Expand"}
                    >
                        {expanded ? (
                            <IconChevronDown size={14} />
                        ) : (
                            <IconChevronRight size={14} />
                        )}
                    </ActionIcon>
                    <Tooltip label="Delete" withArrow>
                        <ActionIcon
                            size={28}
                            variant="subtle"
                            color="red"
                            onClick={onDelete}
                            disabled={isPendingDelete}
                            aria-label="Delete assessment"
                        >
                            <IconTrash size={14} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>

            {/* Expandable Q&A details */}
            <Collapse in={expanded}>
                <Divider my="sm" />
                <Stack gap="md">
                    {assessment.summary && (
                        <Box>
                            <Text
                                size="xs"
                                fw={700}
                                c="dimmed"
                                mb={4}
                                style={{
                                    textTransform: "uppercase",
                                    letterSpacing: "0.5px",
                                }}
                            >
                                Clinical Summary
                            </Text>
                            <Text size="sm" c="dimmed" lh={1.6}>
                                {assessment.summary}
                            </Text>
                        </Box>
                    )}
                    <Box>
                        <Text
                            size="xs"
                            fw={700}
                            c="dimmed"
                            mb={8}
                            style={{
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                            }}
                        >
                            Assessment Q&amp;A
                        </Text>
                        <Stack gap="md">
                            {assessment.qa.map((pair, i) => (
                                <QaItem key={i} pair={pair} index={i} />
                            ))}
                        </Stack>
                    </Box>
                </Stack>
            </Collapse>
        </Paper>
    );
}

// ── Skeleton loaders ──────────────────────────────────────────────────────────

function AssessmentSkeletons() {
    return (
        <Stack gap="sm">
            {["sk-a", "sk-b", "sk-c"].map((k) => (
                <Skeleton key={k} height={80} radius="lg" />
            ))}
        </Stack>
    );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
    return (
        <Box py={80} style={{ textAlign: "center" }}>
            <ThemeIcon
                size={64}
                radius="xl"
                color="gray"
                variant="light"
                mx="auto"
                mb="md"
            >
                <IconMessageQuestion size={32} />
            </ThemeIcon>
            <Text size="sm" c="dimmed" maw={320} mx="auto" lh={1.6}>
                No assessments saved yet. Start a clinical assessment chat and
                the AI will automatically save your Q&amp;A here.
            </Text>
        </Box>
    );
}

// ── Main content ──────────────────────────────────────────────────────────────

export function AssessmentsContent() {
    const { data: assessments = [], isLoading } = useAssessmentsQuery();
    const deleteAssessment = useDeleteAssessmentMutation();

    function handleDelete(id: string, title: string) {
        modals.openConfirmModal({
            title: "Delete assessment?",
            children: (
                <Text size="sm">
                    <strong>{title}</strong> will be permanently deleted. This
                    cannot be undone.
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
                });
            },
        });
    }

    return (
        <Container pt="md">
            <Card radius="xl" shadow="xl">
                <Card.Section px="xl" py="lg" withBorder>
                    <Group justify="space-between" wrap="nowrap">
                        <Group gap={12} wrap="nowrap">
                            <ThemeIcon size={40} radius="md" color="primary" variant="light">
                                <IconClipboardHeart size={22} />
                            </ThemeIcon>
                            <Box>
                                <Title order={3} style={{ lineHeight: 1.2 }}>My Assessments</Title>
                                <Text size="xs" c="dimmed">
                                    AI clinical assessments — linked to your chat sessions
                                </Text>
                            </Box>
                        </Group>
                        {!isLoading && assessments.length > 0 && (
                            <Badge variant="light" color="primary" radius="xl" size="lg">
                                {assessments.length}
                            </Badge>
                        )}
                    </Group>
                </Card.Section>
                <Card.Section p="md">
                    <Box style={{ flex: 1, overflow: "hidden" }}>
                        <ScrollArea style={{ height: "100%" }}>
                            <Box maw={800} mx="auto">
                                {(() => {
                                    if (isLoading) return <AssessmentSkeletons />;
                                    if (assessments.length === 0) return <EmptyState />;
                                    return (
                                        <Stack gap="sm">
                                            {assessments.map((assessment: AssessmentRecord) => (
                                                <AssessmentCard
                                                    key={assessment.id}
                                                    assessment={assessment}
                                                    isPendingDelete={
                                                        deleteAssessment.isPending &&
                                                        deleteAssessment.variables === assessment.id
                                                    }
                                                    onDelete={() =>
                                                        handleDelete(assessment.id, assessment.title)
                                                    }
                                                />
                                            ))}
                                        </Stack>
                                    );
                                })()}
                            </Box>
                        </ScrollArea>
                    </Box>
                </Card.Section>
            </Card>
        </Container>
    );
}
