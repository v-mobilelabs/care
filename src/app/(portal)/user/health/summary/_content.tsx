"use client";
import { MotionCard } from "@/ui/components/motion-card";

import {
    Badge,
    Box,
    Button,
    Divider,
    Group,
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
import { useEffect, useRef, useState } from "react";

import { formatDate } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import Link from "@/ui/link";
import {
    useConditionsQuery,
    useMedicationsQuery,
    usePatientQuery,
    useProfileQuery,
    useVitalsQuery,
    type VitalRecord,
} from "@/app/(portal)/user/_query";
import {
    usePatchPatientSummaryMutation,
    usePatientSummaryQuery,
    useSymptomObservationsQuery,
    type PatientSummaryRecord,
} from "@/ui/ai/query";
import { colors } from "@/ui/tokens";

type SummaryActionItemStatus = "pending" | "done" | "skipped";

function buildCountLabel(count: number, singular: string, plural: string): string {
    return `${count} ${count === 1 ? singular : plural}`;
}

function ensureArray<T>(value: T[] | null | undefined): T[] {
    if (Array.isArray(value)) {
        return value;
    }

    return [];
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
    const diagnoses = ensureArray(summary.diagnoses);
    const recommendations = ensureArray(summary.recommendations);
    const hasDiagnoses = diagnoses.length > 0;
    const hasRecommendations = recommendations.length > 0;

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
    const recommendations = ensureArray(summary.recommendations);

    if (recommendations.length > 0) {
        return "Review the recommendations first, then use them in your next chat, doctor visit, or self-tracking check-in.";
    }

    if (summary.sessionId) {
        return "Open the linked consultation to continue the conversation with the same context already attached.";
    }

    return "Keep this summary as a quick reference when you need to explain your recent symptoms, findings, or care history.";
}

function getSummaryUpdatedByLabel(summary: PatientSummaryRecord): string {
    if (summary.lastUpdatedBy === "doctor_edit") {
        return "Doctor";
    }

    if (summary.lastUpdatedBy === "assistant_update") {
        return "Assistant";
    }

    if (summary.lastUpdatedBy === "system_rebuild") {
        return "System";
    }

    return "Unknown source";
}

function getMissingSummaryFields(summary: PatientSummaryRecord): string[] {
    const missing: string[] = [];

    if (summary.narrative.trim().length === 0) {
        missing.push("Narrative");
    }
    if (ensureArray(summary.chiefComplaints).length === 0) {
        missing.push("Chief complaints");
    }
    if (ensureArray(summary.diagnoses).length === 0) {
        missing.push("Diagnoses");
    }
    if (ensureArray(summary.medications).length === 0) {
        missing.push("Medications");
    }
    if (ensureArray(summary.recommendations).length === 0) {
        missing.push("Recommendations");
    }

    return missing;
}

function getChecklistItems(summary: PatientSummaryRecord): PatientSummaryRecord["actionItems"] {
    if (ensureArray(summary.actionItems).length > 0) {
        return ensureArray(summary.actionItems);
    }

    const recommendations = ensureArray(summary.recommendations);
    if (recommendations.length === 0) {
        return [];
    }

    return recommendations.map((recommendation, index) => ({
        id: `rec-${index + 1}`,
        text: recommendation,
        status: "pending" as const,
        updatedAt: summary.updatedAt,
    }));
}

function getActionItemStatusColor(status: SummaryActionItemStatus): string {
    if (status === "done") {
        return colors.success;
    }

    if (status === "skipped") {
        return colors.warning;
    }

    return "gray";
}

function getActionItemStatusLabel(status: SummaryActionItemStatus): string {
    if (status === "done") {
        return "Done";
    }

    if (status === "skipped") {
        return "Skipped";
    }

    return "Pending";
}

function getThreeMonthsAgoIso(): string {
    const now = new Date();
    now.setMonth(now.getMonth() - 3);
    return now.toISOString();
}

function formatPatientDetails(summary: PatientSummaryRecord, profile: ReturnType<typeof useProfileQuery>["data"], patient: ReturnType<typeof usePatientQuery>["data"]): string[] {
    const details: string[] = [];

    if (profile?.name) {
        details.push(`Name: ${profile.name}`);
    }
    if (profile?.dateOfBirth) {
        details.push(`DOB: ${formatDate(profile.dateOfBirth)}`);
    }

    const sex = patient?.sex ?? profile?.sex;
    if (sex) {
        details.push(`Sex: ${sex}`);
    }

    if (profile?.gender) {
        details.push(`Gender: ${profile.gender}`);
    }

    const location = [profile?.city, profile?.country].filter(Boolean).join(", ");
    if (location.length > 0) {
        details.push(`Location: ${location}`);
    }

    if (patient?.bloodGroup) {
        details.push(`Blood group: ${patient.bloodGroup}`);
    }

    if (details.length === 0) {
        details.push(`Summary title: ${summary.title}`);
    }

    return details;
}

function formatVitalSnapshot(vital: VitalRecord): string {
    const parts: string[] = [];

    if (vital.systolicBp !== undefined && vital.diastolicBp !== undefined) {
        parts.push(`BP ${vital.systolicBp}/${vital.diastolicBp}`);
    }
    if (vital.restingHr !== undefined) {
        parts.push(`HR ${vital.restingHr}`);
    }
    if (vital.spo2 !== undefined) {
        parts.push(`SpO₂ ${vital.spo2}%`);
    }
    if (vital.temperatureC !== undefined) {
        parts.push(`Temp ${vital.temperatureC}°C`);
    }
    if (vital.glucoseMgdl !== undefined) {
        parts.push(`Glucose ${vital.glucoseMgdl}`);
    }
    if (vital.weightKg !== undefined) {
        parts.push(`Weight ${vital.weightKg}kg`);
    }

    if (parts.length === 0) {
        return formatDate(vital.measuredAt);
    }

    return `${formatDate(vital.measuredAt)} · ${parts.join(" · ")}`;
}

function getRecentSymptoms(
    observationsPages: ReturnType<typeof useSymptomObservationsQuery>["data"],
): string[] {
    if (!observationsPages) {
        return [];
    }

    const thresholdIso = getThreeMonthsAgoIso();
    const items = observationsPages.pages
        .flatMap((page) => page.observations)
        .filter((observation) => observation.observedAt >= thresholdIso)
        .sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime())
        .slice(0, 8)
        .map((observation) => {
            const state = observation.state ? ` (${observation.state})` : "";
            return `${observation.symptom}${state}`;
        });

    return items;
}

function SummaryLegend() {
    return (
        <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder radius="lg" p="md">
            <Stack gap="sm">
                <Stack gap={4}>
                    <Title order={5} lh={1.2}>
                        How to use summaries
                    </Title>
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
                        <Text size="xs" lh={1.5}>
                            Narrative, complaints, diagnoses, medications, vitals, and recommendations when available.
                        </Text>
                    </MotionCard>
                    <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder radius="md" p="sm">
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                            Why it helps
                        </Text>
                        <Text size="xs" lh={1.5}>
                            You can review your care context quickly before another chat, referral, or appointment.
                        </Text>
                    </MotionCard>
                    <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder radius="md" p="sm">
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                            What it is not
                        </Text>
                        <Text size="xs" lh={1.5}>
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
    showEmptyState = false,
    emptyStateText = "No data available yet.",
    emptyStateCtaLabel,
    emptyStateCtaHref,
}: Readonly<{
    title: string;
    items: string[];
    color?: string;
    showEmptyState?: boolean;
    emptyStateText?: string;
    emptyStateCtaLabel?: string;
    emptyStateCtaHref?: string;
}>) {
    if (items.length === 0) {
        if (!showEmptyState) {
            return null;
        }

        return (
            <Box>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={6}>
                    {title}
                </Text>
                <Text size="xs" c="dimmed" lh={1.5}>
                    {emptyStateText}
                </Text>
                {emptyStateCtaLabel && emptyStateCtaHref ? (
                    <Button
                        component={Link}
                        href={emptyStateCtaHref}
                        size="xs"
                        variant="subtle"
                        color="primary"
                        mt={6}
                    >
                        {emptyStateCtaLabel}
                    </Button>
                ) : null}
            </Box>
        );
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

function ClinicalOverviewSection({
    title,
    items,
    color = "gray",
    emptyStateText,
    emptyStateCtaLabel,
    emptyStateCtaHref,
}: Readonly<{
    title: string;
    items: string[];
    color?: string;
    emptyStateText: string;
    emptyStateCtaLabel?: string;
    emptyStateCtaHref?: string;
}>) {
    return (
        <SummarySection
            title={title}
            items={items}
            color={color}
            showEmptyState
            emptyStateText={emptyStateText}
            emptyStateCtaLabel={emptyStateCtaLabel}
            emptyStateCtaHref={emptyStateCtaHref}
        />
    );
}

function DoctorHandoffCard({
    summary,
    patientDetails,
    allergies,
    recentSymptoms,
    recentVitals,
    conditionItems,
    activeMedicationItems,
}: Readonly<{
    summary: PatientSummaryRecord;
    patientDetails: string[];
    allergies: string[];
    recentSymptoms: string[];
    recentVitals: string[];
    conditionItems: string[];
    activeMedicationItems: string[];
}>) {
    const snapshotReadiness = [
        recentSymptoms.length > 0,
        recentVitals.length > 0,
        conditionItems.length > 0,
        activeMedicationItems.length > 0,
    ].filter(Boolean).length;

    let readinessLabel = "Foundational";
    let readinessColor: string = colors.warning;

    if (snapshotReadiness >= 3) {
        readinessLabel = "Doctor-ready";
        readinessColor = colors.success;
    }

    const keySignals = [
        recentSymptoms.length > 0
            ? `${recentSymptoms.length} recent symptom updates (90 days)`
            : "No recent symptom updates",
        recentVitals.length > 0
            ? `Latest vitals available (${recentVitals.length} entries)`
            : "No recent vitals captured",
        conditionItems.length > 0
            ? `${conditionItems.length} tracked conditions`
            : "No active condition list",
        activeMedicationItems.length > 0
            ? `${activeMedicationItems.length} active medications`
            : "No active medication list",
    ];

    const riskFactors = ensureArray(summary.riskFactors);
    const redFlags = [
        ...allergies.map((a) => `Allergy: ${a}`),
        ...riskFactors,
    ];

    const actionItems = ensureArray(summary.actionItems);
    const pendingFollowUps = actionItems.length > 0
        ? actionItems.filter((item) => item.status === "pending").map((item) => item.text)
        : ensureArray(summary.recommendations).slice(0, 5);

    const handoffNote = summary.narrative.trim().length > 0
        ? summary.narrative
        : "Narrative not available yet. Encourage the patient to capture their symptom timeline, active treatment, and current concerns before handoff.";

    return (
        <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder radius="lg" p="md">
            <Stack gap="md">
                <Group justify="space-between" align="center" wrap="nowrap">
                    <Box>
                        <Title order={5} lh={1.2}>Doctor handoff snapshot</Title>
                        <Text size="xs" c="dimmed">
                            Structured high-level context for quick clinical review.
                        </Text>
                    </Box>
                    <Badge size="sm" variant="light" color={readinessColor} radius="sm">
                        {readinessLabel}
                    </Badge>
                </Group>

                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder radius="md" p="sm">
                        <Stack gap={6}>
                            <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                                Patient context
                            </Text>
                            {patientDetails.length > 0 ? (
                                patientDetails.slice(0, 5).map((detail) => (
                                    <Text key={`detail-${detail}`} size="sm">• {detail}</Text>
                                ))
                            ) : (
                                <Text size="sm" c="dimmed">Patient profile details are not available yet.</Text>
                            )}
                        </Stack>
                    </MotionCard>

                    <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder radius="md" p="sm">
                        <Stack gap={6}>
                            <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                                Clinical signals
                            </Text>
                            {keySignals.map((signal) => (
                                <Text key={`signal-${signal}`} size="sm">• {signal}</Text>
                            ))}
                        </Stack>
                    </MotionCard>
                </SimpleGrid>

                {redFlags.length > 0 ? (
                    <MotionCard interactive blobColor="var(--mantine-color-primary-6)"
                        withBorder
                        radius="md"
                        p="sm"
                        style={{ background: "light-dark(var(--mantine-color-orange-0), rgba(255, 150, 50, 0.07))" }}
                    >
                        <Stack gap={6}>
                            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                                Red flags & risk factors
                            </Text>
                            <Group gap={6}>
                                {redFlags.map((flag) => (
                                    <Badge key={`flag-${flag}`} size="sm" variant="light" color={colors.danger} radius="sm">
                                        {flag}
                                    </Badge>
                                ))}
                            </Group>
                        </Stack>
                    </MotionCard>
                ) : null}

                {pendingFollowUps.length > 0 ? (
                    <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder radius="md" p="sm">
                        <Stack gap={6}>
                            <Group justify="space-between" align="center" wrap="nowrap">
                                <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                                    Pending follow-ups
                                </Text>
                                <Badge size="xs" variant="light" color={colors.warning} radius="sm">
                                    {pendingFollowUps.length} open
                                </Badge>
                            </Group>
                            <Stack gap={4}>
                                {pendingFollowUps.slice(0, 5).map((item) => (
                                    <Text key={`fu-${item}`} size="sm">• {item}</Text>
                                ))}
                            </Stack>
                        </Stack>
                    </MotionCard>
                ) : null}

                <MotionCard interactive blobColor="var(--mantine-color-primary-6)"
                    withBorder
                    radius="md"
                    p="sm"
                    style={{ background: "light-dark(var(--mantine-color-gray-0), rgba(255, 255, 255, 0.02))" }}
                >
                    <Stack gap={6}>
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                            Clinical narrative
                        </Text>
                        <Text size="sm" lh={1.6}>{handoffNote}</Text>
                    </Stack>
                </MotionCard>

                <Box>
                    <Group gap="xs" wrap="nowrap" align="center">
                        <Text size="xs" c="dimmed">
                            Last clinician touchpoint: {formatDate(summary.updatedAt)} · {getSummaryUpdatedByLabel(summary)}
                        </Text>
                        {summary.sessionId ? (
                            <Link href={`/user/assistant?id=${summary.sessionId}`}>
                                <Button size="xs" variant="subtle" color="primary" p={0} h="auto" style={{ fontSize: "var(--mantine-font-size-xs)" }}>
                                    Open session ↗
                                </Button>
                            </Link>
                        ) : null}
                    </Group>
                </Box>
            </Stack>
        </MotionCard>
    );
}

function SummaryCard({
    summary,
    draftNarrative,
    setDraftNarrative,
    onSaveNarrative,
    onUpdateActionItem,
    isSavingActionItem,
    isSavingNarrative,
}: Readonly<{
    summary: PatientSummaryRecord;
    draftNarrative: string;
    setDraftNarrative: (value: string) => void;
    onSaveNarrative: () => void;
    onUpdateActionItem: (actionItemId: string, status: SummaryActionItemStatus) => void;
    isSavingActionItem: boolean;
    isSavingNarrative: boolean;
}>) {
    const chiefComplaints = ensureArray(summary.chiefComplaints);
    const diagnoses = ensureArray(summary.diagnoses);
    const medications = ensureArray(summary.medications);
    const vitals = ensureArray(summary.vitals);
    const allergies = ensureArray(summary.allergies);
    const riskFactors = ensureArray(summary.riskFactors);
    const recommendations = ensureArray(summary.recommendations);
    const actionItems = getChecklistItems(summary);
    const completedActionCount = actionItems.filter((item) => item.status === "done").length;

    const metadata = [
        buildCountLabel(chiefComplaints.length, "complaint", "complaints"),
        buildCountLabel(diagnoses.length, "diagnosis", "diagnoses"),
        buildCountLabel(recommendations.length, "recommendation", "recommendations"),
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
                            <Title
                                order={5}
                                lh={1.2}
                                style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                            >
                                {summary.title}
                            </Title>
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
                            <Text size="xs" lh={1.5}>{getSummaryWhyItMatters(summary)}</Text>
                        </Box>

                        <Box>
                            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                                Suggested next step
                            </Text>
                            <Text size="xs" lh={1.5}>{getSummaryNextStep(summary)}</Text>
                        </Box>
                    </Stack>
                </MotionCard>

                <SummarySection title="Chief complaints" items={chiefComplaints} color="primary" />
                <SummarySection
                    title="Diagnoses"
                    items={diagnoses.map((diagnosis) => formatDiagnosisBadge(diagnosis))}
                    color={colors.brand}
                />
                <SummarySection
                    title="Medications"
                    items={medications.map((medication) => formatMedicationText(medication))}
                />
                <SummarySection
                    title="Vitals"
                    items={vitals.map((vital) => formatVitalText(vital))}
                />
                <SummarySection title="Allergies" items={allergies} color={colors.warning} />
                <SummarySection title="Risk factors" items={riskFactors} color={colors.warning} />
                <SummarySection title="Recommendations" items={recommendations} color={colors.success} />

                {actionItems.length > 0 ? (
                    <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder radius="md" p="sm">
                        <Stack gap="sm">
                            <Group justify="space-between" align="center" wrap="nowrap">
                                <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                                    Action checklist
                                </Text>
                                <Badge size="xs" variant="light" color="gray" radius="sm">
                                    {completedActionCount}/{actionItems.length} done
                                </Badge>
                            </Group>

                            <Stack gap={8}>
                                {actionItems.map((item) => (
                                    <MotionCard interactive blobColor="var(--mantine-color-primary-6)" key={item.id} withBorder radius="md" p="xs">
                                        <Stack gap={6}>
                                            <Group justify="space-between" align="flex-start" wrap="nowrap">
                                                <Text size="sm" style={{ flex: 1 }}>{item.text}</Text>
                                                <Badge size="xs" variant="light" color={getActionItemStatusColor(item.status)} radius="sm">
                                                    {getActionItemStatusLabel(item.status)}
                                                </Badge>
                                            </Group>

                                            <Group gap={6}>
                                                <Button
                                                    size="xs"
                                                    variant="subtle"
                                                    color={colors.success}
                                                    onClick={() => onUpdateActionItem(item.id, "done")}
                                                    disabled={item.status === "done" || isSavingActionItem}
                                                >
                                                    Mark done
                                                </Button>
                                                <Button
                                                    size="xs"
                                                    variant="subtle"
                                                    color={colors.warning}
                                                    onClick={() => onUpdateActionItem(item.id, "skipped")}
                                                    disabled={item.status === "skipped" || isSavingActionItem}
                                                >
                                                    Skip
                                                </Button>
                                                <Button
                                                    size="xs"
                                                    variant="subtle"
                                                    color="gray"
                                                    onClick={() => onUpdateActionItem(item.id, "pending")}
                                                    disabled={item.status === "pending" || isSavingActionItem}
                                                >
                                                    Reset
                                                </Button>
                                            </Group>
                                        </Stack>
                                    </MotionCard>
                                ))}
                            </Stack>
                        </Stack>
                    </MotionCard>
                ) : null}

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
                                    trackEvent({
                                        name: "patient_summary_open_linked_session",
                                        params: {
                                            summary_id: summary.id,
                                            session_id: summary.sessionId,
                                            version: summary.version,
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
    const summaryQuery = usePatientSummaryQuery();
    const patchMutation = usePatchPatientSummaryMutation();
    const summary = summaryQuery.data;
    const { data: profile } = useProfileQuery();
    const { data: patient } = usePatientQuery();
    const { data: vitals = [] } = useVitalsQuery();
    const { data: conditions = [] } = useConditionsQuery();
    const { data: medications = [] } = useMedicationsQuery();
    const symptomObservationsQuery = useSymptomObservationsQuery({
        limit: 100,
        sortDir: "desc",
    });
    const [draftNarrative, setDraftNarrative] = useState("");
    const viewedTrackingRef = useRef("");
    const incompleteTrackingRef = useRef("");

    let subtitle = "Single living medical summary";
    if (summary) {
        subtitle = `Updated ${formatDate(summary.updatedAt)}`;
    }

    const missingFields = summary ? getMissingSummaryFields(summary) : [];

    const recentSymptoms = getRecentSymptoms(symptomObservationsQuery.data);
    const allergies = patient?.allergies?.length ? patient.allergies : summary?.allergies ?? [];
    const patientDetails = summary ? formatPatientDetails(summary, profile, patient) : [];
    const recentVitals = [...vitals]
        .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())
        .slice(0, 5)
        .map((vital) => formatVitalSnapshot(vital));
    const conditionItems = conditions
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8)
        .map((condition) => `${condition.name} · ${condition.status}`);
    const activeMedicationItems = medications
        .filter((medication) => medication.status === "active")
        .slice(0, 8)
        .map((medication) => medication.dosage ? `${medication.name} (${medication.dosage})` : medication.name);

    function handleUpdateActionItem(actionItemId: string, status: SummaryActionItemStatus) {
        if (!summary) {
            return;
        }

        const currentActionItems = getChecklistItems(summary);
        const nextActionItems = currentActionItems.map((item) => {
            if (item.id !== actionItemId) {
                return item;
            }

            return {
                ...item,
                status,
                updatedAt: new Date().toISOString(),
            };
        });

        patchMutation.mutate(
            {
                expectedVersion: summary.version,
                patch: {
                    actionItems: nextActionItems,
                },
                reason: "assistant_update",
            },
            {
                onSuccess: () => {
                    trackEvent({
                        name: "patient_summary_action_checked",
                        params: {
                            summary_id: summary.id,
                            action_item_id: actionItemId,
                            action_status: status,
                            version: summary.version,
                        },
                    });
                },
                onError: async (error) => {
                    const message = error instanceof Error ? error.message : "Could not update checklist item.";
                    const hasConflict = message.toLowerCase().includes("version conflict");

                    if (hasConflict) {
                        await summaryQuery.refetch();
                        notifications.show({
                            title: "Summary changed elsewhere",
                            message: "A newer summary version exists. We reloaded the latest document — please try again.",
                            color: colors.warning,
                        });
                        return;
                    }

                    notifications.show({
                        title: "Checklist update failed",
                        message,
                        color: colors.danger,
                    });
                },
            },
        );
    }

    useEffect(() => {
        setDraftNarrative(summary?.narrative ?? "");
    }, [summary?.id, summary?.version, summary?.narrative]);

    useEffect(() => {
        if (!summary) {
            return;
        }

        const trackingKey = `${summary.id}:${summary.version}`;
        if (viewedTrackingRef.current !== trackingKey) {
            viewedTrackingRef.current = trackingKey;
            trackEvent({
                name: "patient_summary_viewed",
                params: {
                    summary_id: summary.id,
                    version: summary.version,
                    has_diagnoses: ensureArray(summary.diagnoses).length > 0,
                    has_recommendations: ensureArray(summary.recommendations).length > 0,
                    missing_fields_count: missingFields.length,
                    updated_by: summary.lastUpdatedBy ?? "unknown",
                },
            });
        }

        if (missingFields.length > 0 && incompleteTrackingRef.current !== trackingKey) {
            incompleteTrackingRef.current = trackingKey;
            trackEvent({
                name: "patient_summary_incomplete_seen",
                params: {
                    summary_id: summary.id,
                    version: summary.version,
                    missing_fields: missingFields.join(","),
                    missing_fields_count: missingFields.length,
                },
            });
        }
    }, [missingFields, summary]);

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
                    trackEvent({
                        name: "patient_summary_saved",
                        params: {
                            summary_id: summary.id,
                            version: summary.version,
                            updated_by: "assistant_update",
                        },
                    });
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
            <Box pt="md" maw={1080} mx="auto" w="100%">
                <Stack>
                    <Group gap="sm" wrap="nowrap">
                        <ThemeIcon size={36} radius="md" color="primary" variant="light">
                            <IconClipboardHeart size={20} />
                        </ThemeIcon>
                        <Box>
                            <Title order={4} lh={1.2}>My Health Summary</Title>
                            <Text size="xs" c="dimmed">Single living medical summary</Text>
                        </Box>
                    </Group>

                    <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder radius="lg" p="xl" ta="center">
                        <Stack align="center" gap="sm">
                            <ThemeIcon size={48} radius="xl" color="primary" variant="light">
                                <IconClipboardHeart size={24} />
                            </ThemeIcon>
                            <Title order={5}>No summaries yet</Title>
                            <Text size="sm" c="dimmed" maw={420}>
                                Summaries turn your consultations into a concise care brief you can revisit
                                later. Start a consultation and generate your first summary to track progress
                                over time.
                            </Text>
                            <Button component={Link} href="/user/assistant" variant="light" color="primary" mt="xs">
                                Start a consultation
                            </Button>
                        </Stack>
                    </MotionCard>
                </Stack>
            </Box>
        );
    }

    return (
        <Box pt="md" maw={1080} mx="auto" w="100%">
            <Stack>
                <Group justify="space-between" align="center" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap">
                        <ThemeIcon size={36} radius="md" color="primary" variant="light">
                            <IconClipboardHeart size={20} />
                        </ThemeIcon>
                        <Box>
                            <Title order={4} lh={1.2}>My Health Summary</Title>
                            <Text size="xs" c="dimmed">{subtitle}</Text>
                        </Box>
                    </Group>
                    <Badge size="sm" variant="light" color="gray" radius="xl">
                        Version {summary.version}
                    </Badge>
                </Group>

                <Box maw={920}>
                    <Stack gap="md">
                        <DoctorHandoffCard
                            summary={summary}
                            patientDetails={patientDetails}
                            allergies={allergies}
                            recentSymptoms={recentSymptoms}
                            recentVitals={recentVitals}
                            conditionItems={conditionItems}
                            activeMedicationItems={activeMedicationItems}
                        />

                        <MotionCard interactive blobColor="var(--mantine-color-primary-6)"
                            withBorder
                            radius="lg"
                            p="sm"
                            style={{ background: "light-dark(var(--mantine-color-primary-0), rgba(130, 100, 255, 0.08))" }}
                        >
                            <Stack gap={6}>
                                <Group justify="space-between" align="center" wrap="nowrap">
                                    <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                                        Summary quality
                                    </Text>
                                    {missingFields.length === 0 ? (
                                        <Badge size="xs" variant="light" color={colors.success} radius="sm">
                                            Complete
                                        </Badge>
                                    ) : (
                                        <Badge size="xs" variant="light" color={colors.warning} radius="sm">
                                            Needs review
                                        </Badge>
                                    )}
                                </Group>

                                <Text size="xs" c="dimmed">
                                    Updated {formatDate(summary.updatedAt)} by {getSummaryUpdatedByLabel(summary)}.
                                </Text>

                                {missingFields.length === 0 ? (
                                    <Text size="xs">All core sections are filled and ready to reuse.</Text>
                                ) : (
                                    <Group gap={6}>
                                        {missingFields.map((field) => (
                                            <Badge key={`missing-${field}`} size="xs" variant="outline" color={colors.warning} radius="sm">
                                                {field}
                                            </Badge>
                                        ))}
                                    </Group>
                                )}
                            </Stack>
                        </MotionCard>

                        <SummaryLegend />

                        <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder radius="lg" p="md">
                            <Stack gap="md">
                                <Group justify="space-between" align="center" wrap="nowrap">
                                    <Title order={5} lh={1.2}>Clinical overview</Title>
                                    <Badge size="xs" variant="light" color="gray" radius="sm">
                                        Last 3 months focus
                                    </Badge>
                                </Group>

                                <ClinicalOverviewSection
                                    title="Symptoms most recent (3 months)"
                                    items={recentSymptoms}
                                    color="primary"
                                    emptyStateText="No symptoms recorded in the last 3 months."
                                    emptyStateCtaLabel="Log symptoms"
                                    emptyStateCtaHref="/user/health/symptoms"
                                />
                                <ClinicalOverviewSection
                                    title="Allergies"
                                    items={allergies}
                                    color={colors.warning}
                                    emptyStateText="No allergies listed yet."
                                    emptyStateCtaLabel="Add allergies"
                                    emptyStateCtaHref="/user/profile"
                                />
                                <ClinicalOverviewSection
                                    title="Patient details"
                                    items={patientDetails}
                                    color="gray"
                                    emptyStateText="Patient profile details are not available yet."
                                    emptyStateCtaLabel="Update profile"
                                    emptyStateCtaHref="/user/profile"
                                />
                                <ClinicalOverviewSection
                                    title="Recent vitals"
                                    items={recentVitals}
                                    color="cyan"
                                    emptyStateText="No recent vitals available."
                                    emptyStateCtaLabel="Add vitals"
                                    emptyStateCtaHref="/user/health/vitals"
                                />
                                <ClinicalOverviewSection
                                    title="Conditions"
                                    items={conditionItems}
                                    color={colors.brand}
                                    emptyStateText="No conditions documented yet."
                                    emptyStateCtaLabel="Add conditions"
                                    emptyStateCtaHref="/user/health/conditions"
                                />
                                <ClinicalOverviewSection
                                    title="Medications active"
                                    items={activeMedicationItems}
                                    color="blue"
                                    emptyStateText="No active medications found."
                                    emptyStateCtaLabel="Add medications"
                                    emptyStateCtaHref="/user/health/medications"
                                />
                            </Stack>
                        </MotionCard>

                        <SummaryCard
                            summary={summary}
                            draftNarrative={draftNarrative}
                            setDraftNarrative={setDraftNarrative}
                            onSaveNarrative={handleSaveNarrative}
                            onUpdateActionItem={handleUpdateActionItem}
                            isSavingActionItem={patchMutation.isPending}
                            isSavingNarrative={patchMutation.isPending}
                        />
                    </Stack>
                </Box>
            </Stack>
        </Box>
    );
}
