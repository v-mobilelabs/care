"use client";

import {
    Badge,
    Box,
    Button,
    Divider,
    Group,
    Paper,
    ScrollArea,
    SimpleGrid,
    Stack,
    Textarea,
    Text,
    ThemeIcon,
    Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
    IconCheck,
    IconClipboardHeart,
    IconDeviceFloppy,
    IconMessage,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";

import { formatDate } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import Link from "@/ui/link";
import {
    usePatchPatientSummaryMutation,
    usePatientSummaryQuery,
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
        <Paper withBorder radius="lg" p="md">
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
                    <Paper withBorder radius="md" p="sm">
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                            What it includes
                        </Text>
                        <Text size="sm">
                            Narrative, complaints, diagnoses, medications, vitals, and recommendations when available.
                        </Text>
                    </Paper>
                    <Paper withBorder radius="md" p="sm">
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                            Why it helps
                        </Text>
                        <Text size="sm">
                            You can review your care context quickly before another chat, referral, or appointment.
                        </Text>
                    </Paper>
                    <Paper withBorder radius="md" p="sm">
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                            What it is not
                        </Text>
                        <Text size="sm">
                            A summary is a care aid, not a substitute for emergency care or an in-person clinician when needed.
                        </Text>
                    </Paper>
                </SimpleGrid>
            </Stack>
        </Paper>
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
    draftNarrative,
    setDraftNarrative,
    onSaveNarrative,
    isSavingNarrative,
}: Readonly<{
    summary: PatientSummaryRecord;
    draftNarrative: string;
    setDraftNarrative: (value: string) => void;
    onSaveNarrative: () => void;
    isSavingNarrative: boolean;
}>) {
    const metadata = [
        buildCountLabel(summary.chiefComplaints.length, "complaint", "complaints"),
        buildCountLabel(summary.diagnoses.length, "diagnosis", "diagnoses"),
        buildCountLabel(summary.recommendations.length, "recommendation", "recommendations"),
    ];

    return (
        <Paper withBorder radius="lg" p="md">
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
                    <Badge size="xs" variant="light" color="gray" radius="sm">
                        Version {summary.version}
                    </Badge>
                </Group>

                <Group gap={6}>
                    {metadata.map((item) => (
                        <SummaryMetaBadge key={`${summary.id}-${item}`} label={item} />
                    ))}
                </Group>

                <Stack gap={6}>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                        Living narrative
                    </Text>
                    <Textarea
                        autosize
                        minRows={4}
                        maxRows={10}
                        value={draftNarrative}
                        onChange={(event) => setDraftNarrative(event.currentTarget.value)}
                    />
                    <Group justify="space-between" align="center">
                        <Text size="xs" c="dimmed">
                            Last updated {formatDate(summary.updatedAt)}
                        </Text>
                        <Button
                            size="xs"
                            variant="light"
                            color="primary"
                            leftSection={<IconDeviceFloppy size={14} />}
                            onClick={onSaveNarrative}
                            loading={isSavingNarrative}
                            disabled={draftNarrative.trim().length === 0 || draftNarrative === summary.narrative}
                        >
                            Save narrative
                        </Button>
                    </Group>
                </Stack>

                <Divider />

                <Paper
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
                </Paper>

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
        </Paper>
    );
}

export function PatientSummaryContent() {
    const summaryQuery = usePatientSummaryQuery();
    const patchMutation = usePatchPatientSummaryMutation();
    const summary = summaryQuery.data;
    const [draftNarrative, setDraftNarrative] = useState("");

    useEffect(() => {
        setDraftNarrative(summary?.narrative ?? "");
    }, [summary?.id, summary?.version, summary?.narrative]);

    function handleSaveNarrative() {
        if (!summary) {
            return;
        }

        patchMutation.mutate(
            {
                expectedVersion: summary.version,
                patch: {
                    narrative: draftNarrative.trim(),
                },
                reason: "assistant_update",
            },
            {
                onSuccess: () => {
                    notifications.show({
                        title: "Summary updated",
                        message: "Your living summary has been updated.",
                        color: colors.success,
                        icon: <IconCheck size={18} />,
                    });
                },
                onError: async (error) => {
                    const message = error instanceof Error ? error.message : "Could not update summary.";
                    const hasConflict = message.toLowerCase().includes("version conflict");

                    if (hasConflict) {
                        await summaryQuery.refetch();
                        notifications.show({
                            title: "Summary changed elsewhere",
                            message: "A newer summary version exists. We reloaded the latest document — please review and save again.",
                            color: colors.warning,
                        });
                        return;
                    }

                    notifications.show({
                        title: "Update failed",
                        message,
                        color: colors.danger,
                    });
                },
            },
        );
    }

    if (summaryQuery.isLoading) return null;

    if (!summary) {
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
                        <Title order={3}>Patient Summary</Title>
                        <Text size="sm" c="dimmed">Single living medical summary</Text>
                    </Box>
                </Group>

                <SummaryLegend />

                <SummaryCard
                    summary={summary}
                    draftNarrative={draftNarrative}
                    setDraftNarrative={setDraftNarrative}
                    onSaveNarrative={handleSaveNarrative}
                    isSavingNarrative={patchMutation.isPending}
                />
            </Stack>
        </ScrollArea>
    );
}
