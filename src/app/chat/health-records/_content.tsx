"use client";
import type { ReactNode } from "react";
import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Center,
    Collapse,
    Divider,
    Group,
    List,
    Loader,
    Paper,
    Progress,
    ScrollArea,
    SimpleGrid,
    Skeleton,
    Stack,
    Tabs,
    Text,
    ThemeIcon,
    Title,
    Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
    IconActivity,
    IconAlertCircle,
    IconArrowUp,
    IconArrowDown,
    IconCheck,
    IconChevronDown,
    IconChevronRight,
    IconCircleCheck,
    IconClipboardList,
    IconClipboardText,
    IconFlask,
    IconHeartbeat,
    IconMapPin,
    IconMessage,
    IconNotes,
    IconPill,
    IconRefresh,
    IconSalad,
    IconScale,
    IconShield,
    IconStethoscope,
    IconTrash,
    IconUpload,
    IconUser,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import {
    useAssessmentsQuery,
    useBloodTestsQuery,
    useConditionsQuery,
    useDeleteBloodTestMutation,
    useDeleteConditionMutation,
    useDeleteSoapNoteMutation,
    useDependentsQuery,
    useMedicationsQuery,
    useProfileQuery,
    useReExtractBloodTestMutation,
    useSoapNotesQuery,
    useUploadBloodTestMutation,
    type AssessmentRecord,
    type BiomarkerRecord,
    type BiomarkerStatus,
    type BloodTestRecord,
    type ConditionRecord,
    type MedicationRecord,
    type SoapNoteRecord,
} from "@/app/chat/_query";
import { useActiveProfile } from "@/app/chat/_context/active-profile-context";
import { colors } from "@/ui/tokens";

// ── Type helpers ─────────────────────────────────────────────────────────────

type RiskLevel = SoapNoteRecord["riskLevel"];
type Severity = ConditionRecord["severity"];

/** Minimum biometric shape shared by ProfileRecord and DependentRecord */
interface ProfileLike {
    dateOfBirth?: string;
    height?: number;
    weight?: number;
    country?: string;
    city?: string;
    foodPreferences?: string[];
}

// ── Formatting helpers ────────────────────────────────────────────────────────

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function computeBmi(height: number | undefined, weight: number | undefined): number | null {
    if (!height || !weight) return null;
    const hm = height / 100;
    return Math.round((weight / (hm * hm)) * 10) / 10;
}

function bmiCategory(bmi: number): { label: string; color: string } {
    if (bmi < 18.5) return { label: "Underweight", color: colors.warning };
    if (bmi < 25) return { label: "Normal", color: colors.success };
    if (bmi < 30) return { label: "Overweight", color: colors.warning };
    return { label: "Obese", color: colors.danger };
}

function bmiInsight(label: string): string {
    if (label === "Normal") return "Your BMI is within the healthy range (18.5\u201324.9).";
    if (label === "Underweight") return "A BMI below 18.5 may indicate insufficient nutrition \u2014 consider consulting a dietitian.";
    if (label === "Overweight") return "A BMI of 25\u201329.9 is above ideal. Diet and exercise adjustments are recommended.";
    return "A BMI of 30+ is classified as obese. Please consult your doctor for a personalised plan.";
}

function computeAge(dob: string | undefined): number | null {
    if (!dob) return null;
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
}

function riskDescription(risk: RiskLevel): string {
    const map: Record<RiskLevel, string> = {
        low: "No urgent concerns",
        moderate: "Monitor closely",
        high: "Needs attention soon",
        emergency: "Seek care immediately",
    };
    return map[risk];
}

// ── Color / rank maps ─────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<Severity, string> = {
    mild: colors.success,
    moderate: colors.warning,
    severe: colors.danger,
    critical: colors.danger,
};

const STATUS_COLOR: Record<ConditionRecord["status"], string> = {
    suspected: "gray",
    probable: "blue",
    confirmed: colors.success,
};

const RISK_COLOR: Record<RiskLevel, string> = {
    low: colors.success,
    moderate: colors.warning,
    high: colors.danger,
    emergency: colors.danger,
};

const RISK_RANK: Record<RiskLevel, number> = { low: 0, moderate: 1, high: 2, emergency: 3 };
const SEVERITY_RANK: Record<Severity, number> = { mild: 0, moderate: 1, severe: 2, critical: 3 };

// ── Clinical KPI helpers ──────────────────────────────────────────────────────

function getHighestRisk(
    notes: SoapNoteRecord[],
    assessments: AssessmentRecord[],
): RiskLevel | null {
    const noteRisks: RiskLevel[] = notes.map((n) => n.riskLevel);
    const assessmentRisks: RiskLevel[] = assessments.flatMap((a) =>
        a.riskLevel ? [a.riskLevel] : [],
    );
    const all = [...noteRisks, ...assessmentRisks];
    if (all.length === 0) return null;
    return all.reduce((acc, r) => (RISK_RANK[r] > RISK_RANK[acc] ? r : acc));
}

function getWorstSeverity(conditions: ConditionRecord[]): Severity | null {
    if (conditions.length === 0) return null;
    return conditions.reduce(
        (acc, c) => (SEVERITY_RANK[c.severity] > SEVERITY_RANK[acc] ? c.severity : acc),
        conditions[0].severity,
    );
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, color = "primary", description }: Readonly<{
    icon: ReactNode;
    label: string;
    value: string;
    color?: string;
    description?: string;
}>) {
    return (
        <Paper
            withBorder
            radius="lg"
            p="md"
            style={{
                aspectRatio: "4 / 3",
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* Label row — always at top */}
            <Group gap={6} mb={8} wrap="nowrap">
                <ThemeIcon size={26} radius="md" color={color} variant="light" style={{ flexShrink: 0 }}>
                    {icon}
                </ThemeIcon>
                <Text size="xs" c="dimmed" fw={500} style={{ textTransform: "uppercase", letterSpacing: "0.5px", lineHeight: 1.2 }}>
                    {label}
                </Text>
            </Group>
            {/* Value — grows to push description to bottom */}
            <Text fw={800} size="xl" lh={1} style={{ flex: 1, display: "flex", alignItems: "flex-end", paddingBottom: 6 }}>
                {value}
            </Text>
            {/* Description — always at bottom, reserve space even when empty */}
            <Text size="xs" c="dimmed" lh={1.4} style={{ minHeight: 28 }}>
                {description ?? ""}
            </Text>
        </Paper>
    );
}

// ── Patient biometric snapshot ────────────────────────────────────────────────

function PatientSnapshotCard({ name, profile }: Readonly<{
    name: string;
    profile: ProfileLike | undefined;
}>) {
    const age = computeAge(profile?.dateOfBirth);
    const bmi = computeBmi(profile?.height, profile?.weight);
    const bmiCat = bmi !== null ? bmiCategory(bmi) : null;
    const hasLocation = profile?.city ?? profile?.country;

    const vitals: Array<{ label: string; value: string; badge?: { label: string; color: string } }> = [
        { label: "Age", value: age !== null ? `${age} yrs` : "\u2014" },
        { label: "Height", value: profile?.height ? `${profile.height} cm` : "\u2014" },
        { label: "Weight", value: profile?.weight ? `${profile.weight} kg` : "\u2014" },
        {
            label: "BMI",
            value: bmi !== null ? String(bmi) : "\u2014",
            badge: bmiCat ?? undefined,
        },
    ];

    return (
        <Paper
            withBorder
            radius="lg"
            p="md"
            style={{ background: "light-dark(var(--mantine-color-primary-0), rgba(107,79,248,0.06))" }}
        >
            <Group gap="sm" mb="md" wrap="nowrap">
                <ThemeIcon size={40} radius="lg" color="primary" variant="light" style={{ flexShrink: 0 }}>
                    <IconUser size={22} />
                </ThemeIcon>
                <Box style={{ minWidth: 0 }}>
                    <Text fw={700} size="md" lh={1.2} lineClamp={1}>{name}</Text>
                    <Text size="xs" c="dimmed">Health overview</Text>
                </Box>
                {hasLocation && (
                    <Group gap={4} ml="auto" style={{ flexShrink: 0 }}>
                        <IconMapPin size={12} color="var(--mantine-color-dimmed)" />
                        <Text size="xs" c="dimmed">
                            {[profile?.city, profile?.country].filter(Boolean).join(", ")}
                        </Text>
                    </Group>
                )}
            </Group>

            <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="xs">
                {vitals.map(({ label, value, badge }) => (
                    <Box
                        key={label}
                        py="xs"
                        px="xs"
                        style={{
                            aspectRatio: "1",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            textAlign: "center",
                            borderRadius: 8,
                            background: "light-dark(white, var(--mantine-color-dark-7))",
                        }}
                    >
                        <Text size="xs" c="dimmed" mb={4} style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            {label}
                        </Text>
                        <Text fw={700} size="lg" lh={1}>{value}</Text>
                        {badge && (
                            <Badge size="xs" color={badge.color} variant="light" mt={5} radius="sm">
                                {badge.label}
                            </Badge>
                        )}
                    </Box>
                ))}
            </SimpleGrid>

            {profile?.foodPreferences && profile.foodPreferences.length > 0 && (
                <Box mt="sm">
                    <Text size="xs" c="dimmed" mb={6} style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Dietary Preferences
                    </Text>
                    <Group gap={6}>
                        {profile.foodPreferences.map((p) => (
                            <Badge key={p} size="xs" variant="outline" color="primary" radius="sm">{p}</Badge>
                        ))}
                    </Group>
                </Box>
            )}
        </Paper>
    );
}

// ── Condition severity breakdown ──────────────────────────────────────────────

function SeverityBreakdown({ conditions }: Readonly<{ conditions: ConditionRecord[] }>) {
    const total = conditions.length;

    const groups: Array<{ key: Severity; label: string; color: string }> = [
        { key: "critical", label: "Critical", color: colors.danger },
        { key: "severe", label: "Severe", color: colors.danger },
        { key: "moderate", label: "Moderate", color: colors.warning },
        { key: "mild", label: "Mild", color: colors.success },
    ];

    const counts = groups
        .map((g) => ({ ...g, count: conditions.filter((c) => c.severity === g.key).length }))
        .filter((g) => g.count > 0);

    return (
        <Box>
            <Text size="xs" fw={600} c="dimmed" mb={10} style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Severity Breakdown
            </Text>
            <Stack gap={8}>
                {counts.map(({ key, label, color, count }) => (
                    <Box key={key}>
                        <Group justify="space-between" mb={4}>
                            <Text size="xs" c="dimmed">{label}</Text>
                            <Text size="xs" fw={600}>{count} / {total}</Text>
                        </Group>
                        <Progress value={(count / total) * 100} color={color} size="sm" radius="xl" />
                    </Box>
                ))}
            </Stack>
        </Box>
    );
}

// ── Active medications preview ────────────────────────────────────────────────

function ActiveMedicationsPreview({ medications }: Readonly<{ medications: MedicationRecord[] }>) {
    const active = medications.filter((m) => m.status === "active").slice(0, 6);

    return (
        <Box>
            <Text size="xs" fw={600} c="dimmed" mb={10} style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Active Medications
            </Text>
            <Stack gap={6}>
                {active.map((m) => (
                    <Group key={m.id} gap={8} wrap="nowrap">
                        <ThemeIcon size={22} radius="md" color="primary" variant="light" style={{ flexShrink: 0 }}>
                            <IconPill size={12} />
                        </ThemeIcon>
                        <Box style={{ minWidth: 0, flex: 1 }}>
                            <Text size="xs" fw={600} lineClamp={1}>{m.name}</Text>
                            {(m.dosage ?? m.frequency) && (
                                <Text size="xs" c="dimmed" lineClamp={1}>
                                    {[m.dosage, m.frequency].filter(Boolean).join(" \u00b7 ")}
                                </Text>
                            )}
                        </Box>
                        {m.condition && (
                            <Badge size="xs" variant="outline" color="gray" radius="sm" style={{ flexShrink: 0 }}>
                                {m.condition}
                            </Badge>
                        )}
                    </Group>
                ))}
            </Stack>
        </Box>
    );
}

// ── Latest SOAP note preview ──────────────────────────────────────────────────

function LatestSoapNotePreview({ notes }: Readonly<{ notes: SoapNoteRecord[] }>) {
    const router = useRouter();
    const [, startTransition] = useTransition();
    const latest = notes[0];

    if (!latest) return null;

    return (
        <Paper withBorder radius="lg" p="md">
            <Group justify="space-between" wrap="nowrap" mb="sm" gap="sm">
                <Group gap="xs" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                    <ThemeIcon size={30} radius="md" color={RISK_COLOR[latest.riskLevel]} variant="light" style={{ flexShrink: 0 }}>
                        <IconClipboardText size={15} />
                    </ThemeIcon>
                    <Box style={{ minWidth: 0 }}>
                        <Text size="xs" c="dimmed" style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            Latest Clinical Note
                        </Text>
                        <Text fw={600} size="sm" lineClamp={1}>{latest.condition}</Text>
                    </Box>
                </Group>
                <Group gap={4} style={{ flexShrink: 0 }}>
                    <Badge size="xs" variant="light" color={RISK_COLOR[latest.riskLevel]} radius="sm">
                        {latest.riskLevel} risk
                    </Badge>
                    <Tooltip label="Open session" withArrow>
                        <ActionIcon
                            size={26}
                            variant="subtle"
                            color="gray"
                            onClick={() => startTransition(() => router.push(`/chat?id=${latest.sessionId}`))}
                            aria-label="Open session"
                        >
                            <IconMessage size={14} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>

            <Text size="xs" c="dimmed" lh={1.6} lineClamp={2}>{latest.assessment}</Text>

            {latest.plan.length > 0 && (
                <Box mt="sm">
                    <Text size="xs" fw={600} c="dimmed" mb={6} style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Action Plan
                    </Text>
                    <Stack gap={4}>
                        {latest.plan.slice(0, 3).map((item, i) => (
                            // eslint-disable-next-line react/no-array-index-key
                            <Group key={i} gap={6} wrap="nowrap">
                                <ThemeIcon size={16} radius="xl" color={colors.success} variant="light" style={{ flexShrink: 0 }}>
                                    <IconCheck size={9} />
                                </ThemeIcon>
                                <Text size="xs" c="dimmed" lineClamp={1}>{item}</Text>
                            </Group>
                        ))}
                    </Stack>
                </Box>
            )}

            <Text size="xs" c="dimmed" mt="sm">{formatDate(latest.createdAt)}</Text>
        </Paper>
    );
}

// ── Condition card ────────────────────────────────────────────────────────────

function ConditionCard({ condition, isPendingDelete, onDelete }: Readonly<{
    condition: ConditionRecord;
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
                {/* Left: icon + name + badges */}
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }} align="flex-start">
                    <ThemeIcon
                        size={36}
                        radius="md"
                        color={SEVERITY_COLOR[condition.severity]}
                        variant="light"
                        style={{ flexShrink: 0, marginTop: 2 }}
                    >
                        <IconActivity size={18} />
                    </ThemeIcon>
                    <Box style={{ minWidth: 0 }}>
                        <Text fw={600} size="sm" lineClamp={2}>
                            {condition.name}
                        </Text>
                        <Group gap={6} mt={4} wrap="wrap">
                            <Badge size="xs" variant="light" color={STATUS_COLOR[condition.status]} radius="sm">
                                {condition.status}
                            </Badge>
                            <Badge size="xs" variant="light" color={SEVERITY_COLOR[condition.severity]} radius="sm">
                                {condition.severity}
                            </Badge>
                            {condition.icd10 && (
                                <Text size="xs" c="dimmed" ff="monospace">
                                    ICD-10: {condition.icd10}
                                </Text>
                            )}
                            <Text size="xs" c="dimmed">{formatDate(condition.createdAt)}</Text>
                        </Group>
                    </Box>
                </Group>

                {/* Right: actions only */}
                <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }} align="center">
                    {condition.sessionId && (
                        <Tooltip label="Open session" withArrow>
                            <ActionIcon
                                size={28}
                                variant="subtle"
                                color="gray"
                                onClick={() => startTransition(() => router.push(`/chat?id=${condition.sessionId}`))}
                                aria-label="Open source session"
                            >
                                <IconMessage size={14} />
                            </ActionIcon>
                        </Tooltip>
                    )}
                    <ActionIcon
                        size={28}
                        variant="subtle"
                        color="gray"
                        onClick={toggle}
                        aria-label={expanded ? "Collapse" : "Expand"}
                    >
                        {expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                    </ActionIcon>
                    <Tooltip label="Delete" withArrow>
                        <ActionIcon
                            size={28}
                            variant="subtle"
                            color="red"
                            onClick={onDelete}
                            disabled={isPendingDelete}
                            aria-label="Delete condition"
                        >
                            <IconTrash size={14} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>

            {/* Expandable details */}
            <Collapse in={expanded}>
                <Divider my="sm" />
                <Stack gap="xs">
                    <Text size="sm" c="dimmed" lh={1.6}>
                        {condition.description}
                    </Text>
                    {condition.symptoms.length > 0 && (
                        <Box>
                            <Text size="xs" fw={600} c="dimmed" mb={4} style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                Symptoms
                            </Text>
                            <Group gap={6}>
                                {condition.symptoms.map((s) => (
                                    <Badge key={s} size="xs" variant="outline" color="gray" radius="sm">
                                        {s}
                                    </Badge>
                                ))}
                            </Group>
                        </Box>
                    )}
                </Stack>
            </Collapse>
        </Paper>
    );
}

// ── SOAP note card ────────────────────────────────────────────────────────────

function SoapNoteCard({ note, isPendingDelete, onDelete }: Readonly<{
    note: SoapNoteRecord;
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
                {/* Left: icon + condition name + badge */}
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }} align="flex-start">
                    <ThemeIcon
                        size={36}
                        radius="md"
                        color={RISK_COLOR[note.riskLevel]}
                        variant="light"
                        style={{ flexShrink: 0, marginTop: 2 }}
                    >
                        <IconClipboardText size={18} />
                    </ThemeIcon>
                    <Box style={{ minWidth: 0 }}>
                        <Text fw={600} size="sm" lineClamp={2}>
                            {note.condition}
                        </Text>
                        <Group gap={6} mt={4} wrap="wrap">
                            <Badge size="xs" variant="light" color={RISK_COLOR[note.riskLevel]} radius="sm">
                                {note.riskLevel} risk
                            </Badge>
                            <Text size="xs" c="dimmed">{formatDate(note.createdAt)}</Text>
                        </Group>
                    </Box>
                </Group>

                {/* Right: actions only */}
                <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }} align="center">
                    <Tooltip label="Open session" withArrow>
                        <ActionIcon
                            size={28}
                            variant="subtle"
                            color="gray"
                            onClick={() => startTransition(() => router.push(`/chat?id=${note.sessionId}`))}
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
                        {expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                    </ActionIcon>
                    <Tooltip label="Delete" withArrow>
                        <ActionIcon
                            size={28}
                            variant="subtle"
                            color="red"
                            onClick={onDelete}
                            disabled={isPendingDelete}
                            aria-label="Delete SOAP note"
                        >
                            <IconTrash size={14} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>

            {/* SOAP details */}
            <Collapse in={expanded}>
                <Divider my="sm" />
                <Stack gap="md">
                    {[
                        { label: "Subjective", value: note.subjective },
                        { label: "Objective", value: note.objective },
                        { label: "Assessment", value: note.assessment },
                    ].map(({ label, value }) => (
                        <Box key={label}>
                            <Text size="xs" fw={700} c="dimmed" mb={2} style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                {label}
                            </Text>
                            <Text size="sm" c="dimmed" lh={1.6}>{value}</Text>
                        </Box>
                    ))}
                    {note.plan.length > 0 && (
                        <Box>
                            <Text size="xs" fw={700} c="dimmed" mb={4} style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                Plan
                            </Text>
                            <List size="sm" spacing={4} icon={
                                <ThemeIcon size={16} radius="xl" color={colors.success} variant="light">
                                    <IconCheck size={10} />
                                </ThemeIcon>
                            }>
                                {note.plan.map((item, i) => (
                                    // eslint-disable-next-line react/no-array-index-key
                                    <List.Item key={i}><Text size="sm" c="dimmed">{item}</Text></List.Item>
                                ))}
                            </List>
                        </Box>
                    )}
                </Stack>
            </Collapse>
        </Paper>
    );
}

// ── Overview skeleton loader ─────────────────────────────────────────────────

function OverviewSkeletons() {
    return (
        <Stack gap="md">
            <Skeleton height={148} radius="lg" />
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                <Skeleton radius="lg" style={{ aspectRatio: "4 / 3" }} />
                <Skeleton radius="lg" style={{ aspectRatio: "4 / 3" }} />
                <Skeleton radius="lg" style={{ aspectRatio: "4 / 3" }} />
                <Skeleton radius="lg" style={{ aspectRatio: "4 / 3" }} />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <Skeleton height={130} radius="lg" />
                <Skeleton height={130} radius="lg" />
            </SimpleGrid>
            <Skeleton height={160} radius="lg" />
        </Stack>
    );
}

// ── Record card skeleton ──────────────────────────────────────────────────────

function RecordSkeletons() {
    return (
        <Stack gap="sm">
            {["sk-a", "sk-b", "sk-c"].map((k) => (
                <Skeleton key={k} height={72} radius="lg" />
            ))}
        </Stack>
    );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ icon, message }: Readonly<{ icon: ReactNode; message: string }>) {
    return (
        <Box py={80} style={{ textAlign: "center" }}>
            <ThemeIcon size={64} radius="xl" color="gray" variant="light" mx="auto" mb="md">
                {icon}
            </ThemeIcon>
            <Text size="sm" c="dimmed" maw={300} mx="auto" lh={1.6}>
                {message}
            </Text>
        </Box>
    );
}

// ── Overview tab ────────────────────────────────────────────────────────────

function OverviewTab() {
    const router = useRouter();
    const [, startTransition] = useTransition();
    const { activeDependentId, activeProfileLabel } = useActiveProfile();
    const { data: conditions = [], isLoading: loadingConditions } = useConditionsQuery();
    const { data: medications = [], isLoading: loadingMeds } = useMedicationsQuery();
    const { data: notes = [], isLoading: loadingNotes } = useSoapNotesQuery();
    const { data: assessments = [], isLoading: loadingAssessments } = useAssessmentsQuery();
    const { data: selfProfile, isLoading: loadingProfile } = useProfileQuery();
    const { data: dependents = [], isLoading: loadingDependents } = useDependentsQuery();

    const isLoading =
        loadingConditions || loadingMeds || loadingNotes || loadingAssessments ||
        loadingProfile || loadingDependents;

    if (isLoading) return <OverviewSkeletons />;

    // Resolve the active profile's biometric data
    const activeDependent = activeDependentId
        ? dependents.find((d) => d.id === activeDependentId)
        : undefined;

    const profile: ProfileLike | undefined = activeDependent
        ? {
            dateOfBirth: activeDependent.dateOfBirth,
            height: activeDependent.height,
            weight: activeDependent.weight,
            country: activeDependent.country,
            city: activeDependent.city,
        }
        : selfProfile ?? undefined;

    const hasAnyData =
        conditions.length > 0 ||
        medications.length > 0 ||
        notes.length > 0 ||
        assessments.length > 0;

    if (!hasAnyData && !profile?.height && !profile?.weight && !profile?.dateOfBirth) {
        return (
            <EmptyState
                icon={<IconHeartbeat size={32} />}
                message="No health data yet. Start a chat session to have your health records populated automatically."
            />
        );
    }

    const highestRisk = getHighestRisk(notes, assessments);
    const confirmedConditions = conditions.filter((c) => c.status === "confirmed");
    const worstSeverity = getWorstSeverity(confirmedConditions);
    const activeMedications = medications.filter((m) => m.status === "active");
    const bmi = computeBmi(profile?.height, profile?.weight);
    const bmiCat = bmi !== null ? bmiCategory(bmi) : null;

    // Resolve display name: dependent full name, or "My Profile" label
    const displayName = activeDependent
        ? `${activeDependent.firstName} ${activeDependent.lastName}`.trim()
        : activeProfileLabel;

    const kpis: Array<{
        icon: ReactNode;
        label: string;
        value: string;
        color: string;
        description: string;
    }> = [
            {
                icon: <IconShield size={15} />,
                label: "Health Risk",
                value: highestRisk ? capitalize(highestRisk) : "None",
                color: highestRisk ? RISK_COLOR[highestRisk] : "gray",
                description: highestRisk ? riskDescription(highestRisk) : "No risk signals detected",
            },
            {
                icon: <IconActivity size={15} />,
                label: "Conditions",
                value: String(confirmedConditions.length),
                color: worstSeverity ? SEVERITY_COLOR[worstSeverity] : "gray",
                description: `${conditions.length} total tracked`,
            },
            {
                icon: <IconPill size={15} />,
                label: "Medications",
                value: String(activeMedications.length),
                color: activeMedications.length > 0 ? "primary" : "gray",
                description: "currently active",
            },
            {
                icon: <IconClipboardList size={15} />,
                label: "Assessments",
                value: String(assessments.length),
                color: assessments.length > 0 ? "blue" : "gray",
                description: "clinical evaluations",
            },
        ];

    return (
        <Stack gap="md">
            {/* Biometric snapshot */}
            <PatientSnapshotCard name={displayName} profile={profile} />
            {/* Clinical KPI grid */}
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                {kpis.map((kpi) => (
                    <KpiCard
                        key={kpi.label}
                        icon={kpi.icon}
                        label={kpi.label}
                        value={kpi.value}
                        color={kpi.color}
                        description={kpi.description}
                    />
                ))}
            </SimpleGrid>

            {/* Severity breakdown + active meds side by side */}
            {(conditions.length > 0 || activeMedications.length > 0) && (
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    {conditions.length > 0 && (
                        <Paper withBorder radius="lg" p="md">
                            <SeverityBreakdown conditions={conditions} />
                        </Paper>
                    )}
                    {activeMedications.length > 0 && (
                        <Paper withBorder radius="lg" p="md">
                            <ActiveMedicationsPreview medications={medications} />
                        </Paper>
                    )}
                </SimpleGrid>
            )}

            {/* Latest clinical note */}
            {notes.length > 0 && <LatestSoapNotePreview notes={notes} />}

            {/* BMI insight */}
            {bmiCat !== null && bmi !== null && (
                <Paper
                    withBorder
                    radius="lg"
                    p="md"
                    style={{ borderColor: `var(--mantine-color-${bmiCat.color}-3)` }}
                >
                    <Group gap="sm" wrap="nowrap" align="flex-start">
                        <ThemeIcon size={36} radius="md" color={bmiCat.color} variant="light" style={{ flexShrink: 0, marginTop: 2 }}>
                            <IconScale size={18} />
                        </ThemeIcon>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                            <Group gap={6} mb={4}>
                                <Text fw={700} size="sm">BMI {bmi}</Text>
                                <Badge size="xs" color={bmiCat.color} variant="light" radius="sm">{bmiCat.label}</Badge>
                            </Group>
                            <Text size="xs" c="dimmed" lh={1.5} mb={bmiCat.label === "Overweight" || bmiCat.label === "Obese" ? "sm" : 0}>
                                {bmiInsight(bmiCat.label)}
                            </Text>
                            {(bmiCat.label === "Overweight" || bmiCat.label === "Obese") && (
                                <Button
                                    size="xs"
                                    variant="light"
                                    color={bmiCat.color}
                                    leftSection={<IconSalad size={14} />}
                                    onClick={() => {
                                        const id = crypto.randomUUID();
                                        const message = `My BMI is ${bmi} (${bmiCat.label}). Please create a personalised weekly weight loss diet plan to help me reach a healthy BMI.`;
                                        startTransition(() =>
                                            router.push(`/chat?id=${id}&message=${encodeURIComponent(message)}`),
                                        );
                                    }}
                                >
                                    Plan my weight loss diet
                                </Button>
                            )}
                        </Box>
                    </Group>
                </Paper>
            )}
        </Stack>
    );
}

// ── Conditions tab ────────────────────────────────────────────────────────────

function ConditionsTab() {
    const { data: conditions = [], isLoading } = useConditionsQuery();
    const deleteCondition = useDeleteConditionMutation();

    function handleDelete(id: string, name: string) {
        modals.openConfirmModal({
            title: "Remove condition?",
            children: (
                <Text size="sm">
                    <strong>{name}</strong> will be permanently removed from your health records. This cannot be undone.
                </Text>
            ),
            labels: { confirm: "Remove", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => {
                deleteCondition.mutate(id, {
                    onSuccess: () =>
                        notifications.show({
                            title: "Condition removed",
                            message: `${name} has been removed from your health records.`,
                            color: colors.success,
                            icon: <IconCheck size={16} />,
                        }),
                });
            },
        });
    }

    if (isLoading) return <RecordSkeletons />;

    if (conditions.length === 0) {
        return (
            <EmptyState
                icon={<IconActivity size={32} />}
                message="No conditions recorded yet. Conditions detected during your chat sessions will appear here."
            />
        );
    }

    return (
        <Stack gap="sm">
            {conditions.map((c) => (
                <ConditionCard
                    key={c.id}
                    condition={c}
                    isPendingDelete={deleteCondition.isPending && deleteCondition.variables === c.id}
                    onDelete={() => handleDelete(c.id, c.name)}
                />
            ))}
        </Stack>
    );
}

// ── SOAP notes tab ────────────────────────────────────────────────────────────

function SoapNotesTab() {
    const { data: notes = [], isLoading } = useSoapNotesQuery();
    const deleteNote = useDeleteSoapNoteMutation();

    function handleDelete(id: string, condition: string) {
        modals.openConfirmModal({
            title: "Delete SOAP note?",
            children: (
                <Text size="sm">
                    The SOAP note for <strong>{condition}</strong> will be permanently deleted. This cannot be undone.
                </Text>
            ),
            labels: { confirm: "Delete", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => {
                deleteNote.mutate(id, {
                    onSuccess: () =>
                        notifications.show({
                            title: "Note deleted",
                            message: "The SOAP note has been deleted.",
                            color: colors.success,
                            icon: <IconCheck size={16} />,
                        }),
                });
            },
        });
    }

    if (isLoading) return <RecordSkeletons />;

    if (notes.length === 0) {
        return (
            <EmptyState
                icon={<IconNotes size={32} />}
                message="No SOAP notes yet. Clinical notes generated during your chat sessions will appear here."
            />
        );
    }

    return (
        <Stack gap="sm">
            {notes.map((n) => (
                <SoapNoteCard
                    key={n.id}
                    note={n}
                    isPendingDelete={deleteNote.isPending && deleteNote.variables === n.id}
                    onDelete={() => handleDelete(n.id, n.condition)}
                />
            ))}
        </Stack>
    );
}

// ── Blood tests tab ───────────────────────────────────────────────────────────

const BIOMARKER_STATUS_COLOR: Record<BiomarkerStatus, string> = {
    normal: colors.success,
    low: colors.warning,
    high: colors.warning,
    critical: colors.danger,
};

const BIOMARKER_STATUS_ICON: Record<BiomarkerStatus, ReactNode> = {
    normal: <IconCircleCheck size={12} />,
    low: <IconArrowDown size={12} />,
    high: <IconArrowUp size={12} />,
    critical: <IconAlertCircle size={12} />,
};

function biomarkerBadgeColor(status: BiomarkerStatus): string {
    if (status === "normal") return "teal";
    if (status === "critical") return "red";
    return "yellow";
}

function BiomarkerRow({ b }: Readonly<{ b: BiomarkerRecord }>) {
    return (
        <Group justify="space-between" gap="xs" py={4}
            style={{ borderBottom: "1px solid light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))" }}
        >
            <Box style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={500} truncate>{b.name}</Text>
                {b.referenceRange && (
                    <Text size="xs" c="dimmed">Ref: {b.referenceRange}</Text>
                )}
            </Box>
            <Group gap={6} wrap="nowrap" align="center">
                <Text size="sm" fw={600} c={BIOMARKER_STATUS_COLOR[b.status]}>
                    {b.value} {b.unit}
                </Text>
                <Badge
                    size="xs"
                    variant="light"
                    color={biomarkerBadgeColor(b.status)}
                    leftSection={BIOMARKER_STATUS_ICON[b.status]}
                >
                    {b.status}
                </Badge>
            </Group>
        </Group>
    );
}

function BloodTestCard({
    record,
    isPendingDelete,
    isReExtracting,
    onDelete,
    onReExtract,
}: Readonly<{
    record: BloodTestRecord;
    isPendingDelete: boolean;
    isReExtracting: boolean;
    onDelete: () => void;
    onReExtract: () => void;
}>) {
    const [expanded, { toggle }] = useDisclosure(false);

    const abnormalCount = record.biomarkers.filter(
        (b) => b.status !== "normal",
    ).length;
    const criticalCount = record.biomarkers.filter((b) => b.status === "critical").length;

    return (
        <Paper withBorder radius="lg" p="md" opacity={isPendingDelete ? 0.5 : 1}>
            <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Box style={{ flex: 1, minWidth: 0 }}>
                    <Group gap="xs" align="center">
                        <ThemeIcon size={28} radius="md" variant="light" color="primary">
                            <IconFlask size={15} />
                        </ThemeIcon>
                        <Title order={5} lh={1.3} style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {record.testName}
                        </Title>
                    </Group>

                    <Group gap="xs" mt={6} wrap="wrap">
                        {record.testDate && (
                            <Text size="xs" c="dimmed">
                                {formatDate(record.testDate)}
                            </Text>
                        )}
                        {record.labName && (
                            <Text size="xs" c="dimmed">· {record.labName}</Text>
                        )}
                        {record.orderedBy && (
                            <Text size="xs" c="dimmed">· Dr. {record.orderedBy}</Text>
                        )}
                    </Group>

                    <Group gap={6} mt={8} wrap="wrap">
                        <Badge variant="light" size="xs" color="gray">
                            {record.biomarkers.length} parameters
                        </Badge>
                        {abnormalCount > 0 && (
                            <Badge variant="light" size="xs" color="yellow">
                                {abnormalCount} abnormal
                            </Badge>
                        )}
                        {criticalCount > 0 && (
                            <Badge variant="filled" size="xs" color="red">
                                {criticalCount} critical
                            </Badge>
                        )}
                    </Group>
                </Box>

                <Group gap={4} wrap="nowrap">
                    <Tooltip label="Re-extract with AI">
                        <ActionIcon
                            variant="subtle"
                            color="primary"
                            size="sm"
                            loading={isReExtracting}
                            onClick={onReExtract}
                        >
                            <IconRefresh size={14} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Delete">
                        <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            loading={isPendingDelete}
                            onClick={onDelete}
                        >
                            <IconTrash size={14} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>

            {record.biomarkers.length > 0 && (
                <>
                    <Divider my="sm" />
                    <Button
                        variant="subtle"
                        size="compact-xs"
                        color="primary"
                        rightSection={
                            expanded
                                ? <IconChevronDown size={12} />
                                : <IconChevronRight size={12} />
                        }
                        onClick={toggle}
                    >
                        {expanded ? "Hide" : "Show"} {record.biomarkers.length} results
                    </Button>

                    <Collapse in={expanded}>
                        <Stack gap={0} mt="xs">
                            {record.biomarkers.map((b, i) => (
                                // eslint-disable-next-line react/no-array-index-key
                                <BiomarkerRow key={`${b.name}-${i}`} b={b} />
                            ))}
                        </Stack>
                    </Collapse>
                </>
            )}
        </Paper>
    );
}

function BloodTestsTab() {
    const { data: records = [], isLoading } = useBloodTestsQuery();
    const upload = useUploadBloodTestMutation();
    const deleteRecord = useDeleteBloodTestMutation();
    const reExtract = useReExtractBloodTestMutation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [reExtractingId, setReExtractingId] = useState<string | null>(null);

    function handleFiles(files: FileList | null) {
        if (!files || files.length === 0) return;
        Array.from(files).forEach((file) => {
            upload.mutate(file, {
                onSuccess: (record) =>
                    notifications.show({
                        title: "Blood test extracted",
                        message: `${record.testName} — ${record.biomarkers.length} parameters extracted.`,
                        color: colors.success,
                        icon: <IconCheck size={16} />,
                    }),
                onError: (err) =>
                    notifications.show({
                        title: "Upload failed",
                        message: err instanceof Error ? err.message : "Unknown error.",
                        color: colors.danger,
                    }),
            });
        });
    }

    function handleDelete(record: BloodTestRecord) {
        modals.openConfirmModal({
            title: "Delete blood test?",
            children: (
                <Text size="sm">
                    <strong>{record.testName}</strong> and all its results will be permanently removed. This cannot be undone.
                </Text>
            ),
            labels: { confirm: "Delete", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => {
                deleteRecord.mutate(record.id, {
                    onSuccess: () =>
                        notifications.show({
                            message: `${record.testName} deleted.`,
                            color: colors.success,
                            icon: <IconCheck size={16} />,
                        }),
                });
            },
        });
    }

    function handleReExtract(record: BloodTestRecord) {
        setReExtractingId(record.id);
        reExtract.mutate(record.id, {
            onSuccess: (updated) => {
                setReExtractingId(null);
                notifications.show({
                    title: "Re-extracted",
                    message: `${updated.testName} — ${updated.biomarkers.length} parameters updated.`,
                    color: colors.success,
                    icon: <IconCheck size={16} />,
                });
            },
            onError: (err) => {
                setReExtractingId(null);
                notifications.show({
                    title: "Re-extraction failed",
                    message: err instanceof Error ? err.message : "Could not re-extract data.",
                    color: colors.danger,
                });
            },
        });
    }

    return (
        <Stack gap="md">
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                multiple
                style={{ display: "none" }}
                onChange={(e) => handleFiles(e.target.files)}
                onClick={(e) => { (e.target as HTMLInputElement).value = ""; }}
            />

            {/* Upload strip */}
            <Paper
                withBorder
                radius="lg"
                p="lg"
                style={{
                    borderStyle: "dashed",
                    cursor: upload.isPending ? "default" : "pointer",
                    background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))",
                }}
                onClick={() => !upload.isPending && fileInputRef.current?.click()}
            >
                <Center>
                    <Stack align="center" gap="xs">
                        {upload.isPending
                            ? (
                                <>
                                    <Loader size="sm" type="bars" color="primary" />
                                    <Text size="sm" c="dimmed">Uploading &amp; extracting…</Text>
                                </>
                            )
                            : (
                                <>
                                    <ThemeIcon size={40} radius="xl" variant="light" color="primary">
                                        <IconUpload size={20} />
                                    </ThemeIcon>
                                    <Text size="sm" fw={500}>Upload blood test report</Text>
                                    <Text size="xs" c="dimmed">
                                        Image, PDF, or Word document · AI will extract results automatically
                                    </Text>
                                </>
                            )
                        }
                    </Stack>
                </Center>
            </Paper>

            {/* Loading skeletons */}
            {isLoading && (
                <Stack gap="sm">
                    <Skeleton height={100} radius="lg" />
                    <Skeleton height={100} radius="lg" />
                    <Skeleton height={100} radius="lg" />
                </Stack>
            )}

            {/* Empty state */}
            {!isLoading && records.length === 0 && (
                <EmptyState
                    icon={<IconFlask size={32} />}
                    message="No blood tests yet. Upload an image, PDF, or document — AI will extract your results automatically."
                />
            )}

            {/* Records list */}
            {!isLoading && records.length > 0 && (
                <Stack gap="sm">
                    {records.map((r) => (
                        <BloodTestCard
                            key={r.id}
                            record={r}
                            isPendingDelete={
                                deleteRecord.isPending && deleteRecord.variables === r.id
                            }
                            isReExtracting={reExtractingId === r.id}
                            onDelete={() => handleDelete(r)}
                            onReExtract={() => handleReExtract(r)}
                        />
                    ))}
                </Stack>
            )}
        </Stack>
    );
}

// ── Root content ──────────────────────────────────────────────────────────────

export function HealthRecordsContent() {
    return (
        <Box
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                overflow: "hidden",
            }}
        >
            {/* Header */}
            <Box
                px={{ base: "md", sm: "xl" }}
                py="md"
                style={{
                    flexShrink: 0,
                    borderBottom: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                    background: "light-dark(white, var(--mantine-color-dark-8))",
                }}
            >
                <Group gap="sm">
                    <ThemeIcon size={36} radius="md" color="primary" variant="light">
                        <IconHeartbeat size={20} />
                    </ThemeIcon>
                    <Box>
                        <Title order={4} lh={1.2}>Health Records</Title>
                        <Text size="xs" c="dimmed">
                            Your complete clinical summary
                        </Text>
                    </Box>
                </Group>
            </Box>

            {/* Tabs */}
            <Tabs
                defaultValue="overview"
                style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
            >
                <Tabs.List
                    px={{ base: "md", sm: "xl" }}
                    style={{
                        flexShrink: 0,
                        borderBottom: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                        background: "light-dark(white, var(--mantine-color-dark-8))",
                    }}
                >
                    <Tabs.Tab value="overview" leftSection={<IconShield size={14} />}>
                        Overview
                    </Tabs.Tab>
                    <Tabs.Tab value="conditions" leftSection={<IconStethoscope size={14} />}>
                        Conditions
                    </Tabs.Tab>
                    <Tabs.Tab value="soap-notes" leftSection={<IconClipboardText size={14} />}>
                        SOAP Notes
                    </Tabs.Tab>
                    <Tabs.Tab value="blood-tests" leftSection={<IconFlask size={14} />}>
                        Blood Tests
                    </Tabs.Tab>
                </Tabs.List>

                <Box style={{ flex: 1, overflow: "hidden" }}>
                    <ScrollArea style={{ height: "100%" }}>
                        <Box px={{ base: "md", sm: "xl" }} py="lg" maw={800} mx="auto">
                            <Tabs.Panel value="overview">
                                <OverviewTab />
                            </Tabs.Panel>
                            <Tabs.Panel value="conditions">
                                <ConditionsTab />
                            </Tabs.Panel>
                            <Tabs.Panel value="soap-notes">
                                <SoapNotesTab />
                            </Tabs.Panel>
                            <Tabs.Panel value="blood-tests">
                                <BloodTestsTab />
                            </Tabs.Panel>
                        </Box>
                    </ScrollArea>
                </Box>
            </Tabs>
        </Box>
    );
}
