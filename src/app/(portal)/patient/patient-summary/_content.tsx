"use client";
import {
    ActionIcon,
    Badge,
    Box,
    Group,
    Paper,
    ScrollArea,
    Stack,
    Text,
    ThemeIcon,
    Title,
    Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
    IconCheck,
    IconClipboardHeart,
    IconTrash,
} from "@tabler/icons-react";

import {
    usePatientSummariesQuery,
    useDeletePatientSummaryMutation,
    type PatientSummaryRecord,
} from "@/ui/ai/query";
import { colors } from "@/ui/tokens";
import { formatDate } from "@/lib/format";

// ── Summary card ──────────────────────────────────────────────────────────────

function SummaryCard({ summary, onDelete }: Readonly<{
    summary: PatientSummaryRecord;
    onDelete: (id: string) => void;
}>) {
    return (
        <Paper withBorder radius="md" p="md">
            <Group justify="space-between" mb="xs" wrap="nowrap">
                <Group gap="sm" wrap="nowrap" style={{ overflow: "hidden" }}>
                    <ThemeIcon size={36} radius="md" color="primary" variant="light">
                        <IconClipboardHeart size={20} />
                    </ThemeIcon>
                    <Box style={{ overflow: "hidden" }}>
                        <Text fw={600} size="sm" truncate>
                            {summary.title}
                        </Text>
                        <Text size="xs" c="dimmed">{formatDate(summary.createdAt)}</Text>
                    </Box>
                </Group>
                <Tooltip label="Delete summary">
                    <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={() => onDelete(summary.id)}
                    >
                        <IconTrash size={14} />
                    </ActionIcon>
                </Tooltip>
            </Group>

            <Text size="sm" c="dimmed" lineClamp={3} mb="xs">
                {summary.narrative}
            </Text>

            {summary.diagnoses.length > 0 && (
                <Group gap={4} mt="xs">
                    {summary.diagnoses.map((d) => (
                        <Badge key={d.name} size="xs" variant="light" color={colors.brand}>
                            {d.name}
                        </Badge>
                    ))}
                </Group>
            )}
        </Paper>
    );
}

// ── Main content ──────────────────────────────────────────────────────────────

export function PatientSummaryContent() {
    const { data: summaries = [], isLoading } = usePatientSummariesQuery();
    const deleteMutation = useDeletePatientSummaryMutation();

    function handleDelete(id: string) {
        modals.openConfirmModal({
            title: "Delete summary?",
            children: <Text size="sm">This action cannot be undone.</Text>,
            labels: { confirm: "Delete", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => {
                deleteMutation.mutate(id, {
                    onSuccess: () =>
                        notifications.show({
                            title: "Deleted",
                            message: "Summary removed",
                            color: colors.success,
                            icon: <IconCheck size={18} />,
                        }),
                    onError: () =>
                        notifications.show({
                            title: "Delete failed",
                            message: "Could not delete summary. Please try again.",
                            color: colors.danger,
                        }),
                });
            },
        });
    }

    if (isLoading) return null;

    if (summaries.length === 0) {
        return (
            <ScrollArea style={{ flex: 1 }} styles={{ viewport: { height: "100%" } }}>
                <Stack align="center" justify="center" mih={300} gap="sm">
                    <ThemeIcon size={48} radius="xl" color="primary" variant="light">
                        <IconClipboardHeart size={24} />
                    </ThemeIcon>
                    <Title order={4}>No summaries yet</Title>
                    <Text size="sm" c="dimmed" maw={320} ta="center">
                        Patient summaries will appear here after they are generated during consultations.
                    </Text>
                </Stack>
            </ScrollArea>
        );
    }

    return (
        <ScrollArea style={{ flex: 1 }} styles={{ viewport: { height: "100%" } }}>
            <Stack gap="md" maw={720} mx="auto" px="xl" py="xl">
                <Group gap="sm">
                    <ThemeIcon size={36} radius="md" color="primary" variant="light">
                        <IconClipboardHeart size={20} />
                    </ThemeIcon>
                    <Box>
                        <Title order={3}>Patient Summaries</Title>
                        <Text size="sm" c="dimmed">{summaries.length} summary records</Text>
                    </Box>
                </Group>

                {summaries.map((s) => (
                    <SummaryCard key={s.id} summary={s} onDelete={handleDelete} />
                ))}
            </Stack>
        </ScrollArea>
    );
}
