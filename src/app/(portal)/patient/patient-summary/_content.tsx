"use client";
import {
    ActionIcon,
    Badge,
    Box,
    Collapse,
    Divider,
    Group,
    List,
    Paper,
    ScrollArea,
    SimpleGrid,
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
    IconCapsule,
    IconCheck,
    IconChevronDown,
    IconHeartbeat,
    IconNotes,
    IconTrash,
    IconWand,
} from "@tabler/icons-react";

import {
    usePatientSummariesQuery,
    useDeletePatientSummaryMutation,
    type PatientSummaryRecord,
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

// ── Individual summary card ───────────────────────────────────────────────────

function SummaryCard({
    summary,
    isPendingDelete,
    onDelete,
}: Readonly<{
    summary: PatientSummaryRecord;
    isPendingDelete: boolean;
    onDelete: () => void;
}>) {
    const [expanded, { toggle }] = useDisclosure(false);

    const hasDiagnoses = summary.diagnoses.length > 0;
    const hasMeds = summary.medications.length > 0;
    const hasVitals = summary.vitals.length > 0;
    const hasAllergies = summary.allergies.length > 0;
    const hasRisks = summary.riskFactors.length > 0;
    const hasRecs = summary.recommendations.length > 0;
    const hasComplaints = summary.chiefComplaints.length > 0;

    return (
        <Paper
            withBorder
            radius="lg"
            p={0}
            style={{
                overflow: "hidden",
                borderLeft: "4px solid var(--mantine-color-primary-5)",
                opacity: isPendingDelete ? 0.4 : 1,
                transition: "opacity 150ms ease",
            }}
        >
            {/* Header */}
            <Group justify="space-between" px="md" py="sm" wrap="nowrap">
                <Group gap="xs" style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={toggle}>
                    <ThemeIcon size={32} radius="md" color="primary" variant="light">
                        <IconNotes size={17} />
                    </ThemeIcon>
                    <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text fw={600} size="sm" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {summary.title}
                        </Text>
                        <Text size="xs" c="dimmed">{formatDate(summary.createdAt)}</Text>
                    </Box>
                </Group>
                <Group gap={4} style={{ flexShrink: 0 }}>
                    <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        onClick={toggle}
                        aria-label={expanded ? "Collapse" : "Expand"}
                    >
                        <IconChevronDown
                            size={14}
                            style={{
                                transform: expanded ? "rotate(180deg)" : "none",
                                transition: "transform 150ms ease",
                            }}
                        />
                    </ActionIcon>
                    <Tooltip label="Delete summary" position="left" withArrow>
                        <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            onClick={onDelete}
                            loading={isPendingDelete}
                            aria-label="Delete summary"
                        >
                            <IconTrash size={14} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>

            <Divider />

            {/* Narrative (always visible) */}
            <Box px="md" py="sm">
                <Text size="sm" lh={1.65} style={{ whiteSpace: "pre-wrap" }}>
                    {summary.narrative}
                </Text>
            </Box>

            {/* Details — collapsible */}
            <Collapse in={expanded}>
                <Divider />
                <Stack gap="sm" px="md" py="sm">
                    {hasComplaints && (
                        <Box>
                            <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4}>Chief Complaints</Text>
                            <Group gap={6} wrap="wrap">
                                {summary.chiefComplaints.map((c) => (
                                    <Badge key={c} variant="light" color="orange" size="sm">{c}</Badge>
                                ))}
                            </Group>
                        </Box>
                    )}

                    {hasDiagnoses && (
                        <Box>
                            <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4}>Diagnoses</Text>
                            <Stack gap={6}>
                                {summary.diagnoses.map((d) => (
                                    <Group key={d.name} gap={8} wrap="nowrap">
                                        <ThemeIcon size={20} radius="xl" color="teal" variant="light">
                                            <IconCheck size={11} />
                                        </ThemeIcon>
                                        <Text size="sm" fw={500} style={{ flex: 1, minWidth: 0 }}>{d.name}</Text>
                                        {d.icd10 && <Badge size="xs" variant="outline" color="gray">{d.icd10}</Badge>}
                                        <Badge
                                            size="xs"
                                            variant="light"
                                            color={
                                                d.status === "confirmed" ? colors.success
                                                    : d.status === "probable" ? colors.warning
                                                        : "orange"
                                            }
                                        >
                                            {d.status}
                                        </Badge>
                                    </Group>
                                ))}
                            </Stack>
                        </Box>
                    )}

                    {hasMeds && (
                        <Box>
                            <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4}>Medications</Text>
                            <Stack gap={4}>
                                {summary.medications.map((m) => (
                                    <Group key={m.name} gap={6} wrap="nowrap">
                                        <ThemeIcon size={20} radius="xl" color="violet" variant="light">
                                            <IconCapsule size={11} />
                                        </ThemeIcon>
                                        <Text size="sm">{m.name}</Text>
                                        {m.dosage && <Text size="xs" c="dimmed">{m.dosage}</Text>}
                                        {m.frequency && <Text size="xs" c="dimmed">· {m.frequency}</Text>}
                                    </Group>
                                ))}
                            </Stack>
                        </Box>
                    )}

                    {hasVitals && (
                        <Box>
                            <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4}>Vitals</Text>
                            <SimpleGrid cols={2} spacing={6}>
                                {summary.vitals.map((v) => (
                                    <Group key={v.name} gap={6} wrap="nowrap">
                                        <ThemeIcon size={20} radius="xl" color="red" variant="light">
                                            <IconHeartbeat size={11} />
                                        </ThemeIcon>
                                        <Text size="xs">
                                            {v.name}:{" "}
                                            <Text span fw={600}>
                                                {v.value}{v.unit ? ` ${v.unit}` : ""}
                                            </Text>
                                        </Text>
                                    </Group>
                                ))}
                            </SimpleGrid>
                        </Box>
                    )}

                    {hasAllergies && (
                        <Box>
                            <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4}>Allergies</Text>
                            <Group gap={6} wrap="wrap">
                                {summary.allergies.map((a) => (
                                    <Badge key={a} variant="light" color="red" size="sm">{a}</Badge>
                                ))}
                            </Group>
                        </Box>
                    )}

                    {hasRisks && (
                        <Box>
                            <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4}>Risk Factors</Text>
                            <Group gap={6} wrap="wrap">
                                {summary.riskFactors.map((r) => (
                                    <Badge key={r} variant="light" color="yellow" size="sm">{r}</Badge>
                                ))}
                            </Group>
                        </Box>
                    )}

                    {hasRecs && (
                        <Box>
                            <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4}>Recommendations</Text>
                            <List size="sm" spacing={4}>
                                {summary.recommendations.map((rec) => (
                                    <List.Item key={rec}>{rec}</List.Item>
                                ))}
                            </List>
                        </Box>
                    )}
                </Stack>
            </Collapse>
        </Paper>
    );
}

// ── Main page content ─────────────────────────────────────────────────────────

export function PatientSummaryContent() {
    const { data: summaries = [], isLoading } = usePatientSummariesQuery();
    const del = useDeletePatientSummaryMutation();

    function handleDelete(id: string, title: string) {
        modals.openConfirmModal({
            title: "Delete summary?",
            children: (
                <Text size="sm">
                    <strong>{title}</strong> will be permanently deleted. This cannot be undone.
                </Text>
            ),
            labels: { confirm: "Delete", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => {
                del.mutate(id, {
                    onSuccess: () =>
                        notifications.show({
                            title: "Deleted",
                            message: "Patient summary removed.",
                            color: colors.success,
                            icon: <IconCheck size={18} />,
                        }),
                });
            },
        });
    }

    return (
        <ScrollArea style={{ height: "100%" }}>
            <Box p="md" style={{ maxWidth: 760, margin: "0 auto" }}>
                {/* Page header */}
                <Group gap="sm" mb="lg">
                    <ThemeIcon size={40} radius="md" color="primary" variant="light">
                        <IconNotes size={22} />
                    </ThemeIcon>
                    <Box>
                        <Title order={3} lh={1.2}>Patient Summaries</Title>
                        <Text size="sm" c="dimmed">
                            Comprehensive health overviews generated by your AI assistant
                        </Text>
                    </Box>
                </Group>

                {/* How-to hint */}
                <Paper withBorder radius="lg" p="md" mb="lg">
                    <Group gap="sm" wrap="nowrap">
                        <ThemeIcon size={28} radius="md" color="primary" variant="light">
                            <IconWand size={15} />
                        </ThemeIcon>
                        <Text size="sm">
                            Ask the AI to <strong>&quot;Generate patient summary&quot;</strong> or <strong>&quot;Give me a health overview&quot;</strong> during a chat session to create a new summary.
                        </Text>
                    </Group>
                </Paper>

                {/* Content */}
                {(() => {
                    if (isLoading) {
                        return (
                            <Stack gap="sm">
                                {["sk-a", "sk-b", "sk-c"].map((k) => (
                                    <Skeleton key={k} height={120} radius="lg" />
                                ))}
                            </Stack>
                        );
                    }
                    if (summaries.length === 0) {
                        return (
                            <Paper withBorder radius="lg" p="xl" style={{ textAlign: "center" }}>
                                <ThemeIcon size={48} radius="xl" color="gray" variant="light" mx="auto" mb="sm">
                                    <IconNotes size={24} />
                                </ThemeIcon>
                                <Text fw={600} mb={4}>No summaries yet</Text>
                                <Text size="sm" c="dimmed">
                                    Start a chat session and ask the AI to generate a patient summary.
                                </Text>
                            </Paper>
                        );
                    }
                    return (
                        <Stack gap="sm">
                            {summaries.map((s) => (
                                <SummaryCard
                                    key={s.id}
                                    summary={s}
                                    isPendingDelete={del.isPending && del.variables === s.id}
                                    onDelete={() => handleDelete(s.id, s.title)}
                                />
                            ))}
                        </Stack>
                    );
                })()}
            </Box>
        </ScrollArea>
    );
}
