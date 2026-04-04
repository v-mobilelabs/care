"use client";
import { MotionCard } from "@/ui/components/motion-card";

import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Group,
    ScrollArea,
    SimpleGrid,
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
    IconMessage,
    IconTrash,
} from "@tabler/icons-react";

import { formatDate } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import Link from "@/ui/link";
import {
    useDeletePatientSummaryMutation,
    usePatientSummariesQuery,
    type PatientSummaryRecord,
} from "@/ui/ai/query";
import { colors } from "@/ui/tokens";

function buildCountLabel(count: number, singular: string, plural: string): string {
    return `${count} ${count === 1 ? singular : plural}`;
}

function formatDiagnosisBadge(diagnosis: PatientSummaryRecord["diagnoses"][number]): string {
    if (diagnosis.status) {
        return `${diagnosis.name} · ${diagnosis.status}`;
    }

    return diagnosis.name;
}

function formatMedicationText(medication: PatientSummaryRecord["medications"][number]): string {
    const details = [medication.dosage, medication.frequency].filter(Boolean);

    if (details.length === 0) {
        return medication.name;
    }

    return `${medication.name} — ${details.join(" · ")}`;
}

function formatVitalText(vital: PatientSummaryRecord["vitals"][number]): string {
    const value = vital.unit ? `${vital.value} ${vital.unit}` : vital.value;
    return `${vital.name}: ${value}`;
}

function getSummaryWhyItMatters(summary: PatientSummaryRecord): string {
    const hasDiagnoses = summary.diagnoses.length > 0;
    const hasRecommendations = summary.recommendations.length > 0;

    if (hasDiagnoses && hasRecommendations) {
        return "This summary combines what CareAI understood about your symptoms with the follow-up guidance that came out of the consultation.";
    }

    if (hasDiagnoses) {
        return "This summary captures the most important health findings that were identified during your consultation.";
    }

    if (hasRecommendations) {
        return "This summary turns your consultation into a short care brief you can review before taking the next step.";
    }

    return "This summary gives you a reusable snapshot of what was discussed so you do not have to reconstruct your health story from scratch next time.";
}

function getSummaryNextStep(summary: PatientSummaryRecord): string {
    if (summary.recommendations.length > 0) {
        return "Review the recommendations first, then use them in your next chat, doctor visit, or self-tracking check-in.";
    }

    if (summary.sessionId) {
        return "Open the linked consultation to continue the conversation with the same context already attached.";
    }

    return "Keep this summary as a quick reference when you need to explain your recent symptoms, findings, or care history.";
}

function SummaryLegend() {
    return (
        <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder radius="lg" p="md">
            <Stack gap="sm">
                <Stack gap={4}>
                    <Text fw={600} size="sm">
                        How to use summaries
                    </Text>
                    <Text size="sm" c="dimmed">
                        Patient summaries turn a consultation into a cleaner care snapshot: what you reported, what the
                        portal noticed, and what follow-up guidance was suggested. They are designed to be easier to reuse
                        than scrolling through a long chat transcript.
                    </Text>
                </Stack>

                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                    <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder radius="md" p="sm">
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                            What it includes
                        </Text>
                        <Text size="sm">
                            Narrative, complaints, diagnoses, medications, vitals, and recommendations when available.
                        </Text>
                    </MotionCard>
                    <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder radius="md" p="sm">
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                            Why it helps
                        </Text>
                        <Text size="sm">
                            You can review your care context quickly before another chat, referral, or appointment.
                        </Text>
                    </MotionCard>
                    <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder radius="md" p="sm">
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                            What it is not
                        </Text>
                        <Text size="sm">
                            A summary is a care aid, not a substitute for emergency care or an in-person clinician when needed.
                        </Text>
                    </MotionCard>
                </SimpleGrid>
            </Stack>
        </MotionCard>
    );
}

function SummaryMetaBadge({ label }: Readonly<{ label: string }>) {
    return (
        <Badge size="xs" variant="light" color="gray" radius="sm">
            {label}
        </Badge>
    );
}

function SummarySection({
    title,
    items,
    color = "gray",
}: Readonly<{ title: string; items: string[]; color?: string }>) {
    if (items.length === 0) {
        return null;
    }

    return (
        <Box>
            <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={6}>
                {title}
            </Text>
            <Group gap={6}>
                {items.map((item) => (
                    <Badge key={`${title}-${item}`} size="sm" variant="light" color={color} radius="sm">
                        {item}
                    </Badge>
                ))}
            </Group>
        </Box>
    );
}

function SummaryCard({
    summary,
    onDelete,
}: Readonly<{
    summary: PatientSummaryRecord;
    onDelete: (id: string) => void;
}>) {
    const metadata = [
        buildCountLabel(summary.chiefComplaints.length, "complaint", "complaints"),
        buildCountLabel(summary.diagnoses.length, "diagnosis", "diagnoses"),
        buildCountLabel(summary.recommendations.length, "recommendation", "recommendations"),
    ];

    return (
        <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder radius="lg" p="md">
            <Stack gap="md">
                <Group justify="space-between" wrap="nowrap" align="flex-start">
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

                <Group gap={6}>
                    {metadata.map((item) => (
                        <SummaryMetaBadge key={`${summary.id}-${item}`} label={item} />
                    ))}
                </Group>

                <Text size="sm" c="dimmed">
                    {summary.narrative}
                </Text>

                <MotionCard interactive blobColor="var(--mantine-color-primary-6)"
                    withBorder
                    radius="md"
                    p="sm"
                    style={{ background: "light-dark(var(--mantine-color-gray-0), rgba(255, 255, 255, 0.02))" }}
                >
                    <Stack gap="xs">
                        <Box>
                            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                                What this means
                            </Text>
                            <Text size="sm">{getSummaryWhyItMatters(summary)}</Text>
                        </Box>

                        <Box>
                            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                                Suggested next step
                            </Text>
                            <Text size="sm">{getSummaryNextStep(summary)}</Text>
                        </Box>
                    </Stack>
                </MotionCard>

                <SummarySection title="Chief complaints" items={summary.chiefComplaints} color="primary" />
                <SummarySection
                    title="Diagnoses"
                    items={summary.diagnoses.map((diagnosis) => formatDiagnosisBadge(diagnosis))}
                    color={colors.brand}
                />
                <SummarySection
                    title="Medications"
                    items={summary.medications.map((medication) => formatMedicationText(medication))}
                />
                <SummarySection
                    title="Vitals"
                    items={summary.vitals.map((vital) => formatVitalText(vital))}
                />
                <SummarySection title="Allergies" items={summary.allergies} color={colors.warning} />
                <SummarySection title="Risk factors" items={summary.riskFactors} color={colors.warning} />
                <SummarySection title="Recommendations" items={summary.recommendations} color={colors.success} />

                {summary.sessionId ? (
                    <Group>
                        <Link href={`/user/assistant?id=${summary.sessionId}`}>
                            <Button
                                size="xs"
                                variant="light"
                                color="primary"
                                leftSection={<IconMessage size={14} />}
                                onClick={() => {
                                    trackEvent({
                                        name: "health_record_viewed",
                                        params: {
                                            action: "open_linked_session",
                                            surface: "patient_summary",
                                            session_id: summary.sessionId,
                                            summary_id: summary.id,
                                        },
                                    });
                                }}
                            >
                                Open linked session
                            </Button>
                        </Link>
                    </Group>
                ) : null}
            </Stack>
        </MotionCard>
    );
}

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
                    onSuccess: () => {
                        notifications.show({
                            title: "Deleted",
                            message: "Summary removed",
                            color: colors.success,
                            icon: <IconCheck size={18} />,
                        });
                    },
                    onError: () => {
                        notifications.show({
                            title: "Delete failed",
                            message: "Could not delete summary. Please try again.",
                            color: colors.danger,
                        });
                    },
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
                    <Text size="sm" c="dimmed" maw={420} ta="center">
                        Summaries turn your consultations into a concise care brief you can revisit
                        later. Start a consultation and generate your first summary to track progress
                        over time.
                    </Text>
                    <Button component={Link} href="/user/assistant" variant="light" color="primary" mt="xs">
                        Start a consultation
                    </Button>
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

                <SummaryLegend />

                {summaries.map((summary) => (
                    <SummaryCard key={summary.id} summary={summary} onDelete={handleDelete} />
                ))}
            </Stack>
        </ScrollArea>
    );
}
