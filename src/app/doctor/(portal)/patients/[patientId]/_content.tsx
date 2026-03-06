"use client";
import type { ReactNode } from "react";
import {
    ActionIcon,
    Badge,
    Box,
    Collapse,
    Divider,
    Group,
    List,
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
import {
    IconActivity,
    IconAlertCircle,
    IconArrowDown,
    IconArrowUp,
    IconArrowLeft,
    IconCheck,
    IconChevronDown,
    IconChevronRight,
    IconCircleCheck,
    IconClipboardList,
    IconClipboardText,
    IconFlask,
    IconHeartbeat,
    IconMapPin,
    IconNotes,
    IconPill,
    IconScale,
    IconShield,
    IconStethoscope,
    IconUser,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { colors } from "@/ui/tokens";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProfileLike {
    dateOfBirth?: string;
    height?: number;
    weight?: number;
    country?: string;
    city?: string;
    foodPreferences?: string[];
}

interface ConditionRecord {
    id: string;
    name: string;
    icd10?: string;
    severity: "mild" | "moderate" | "severe" | "critical";
    status: "suspected" | "probable" | "confirmed";
    description: string;
    symptoms: string[];
    createdAt: string;
}

interface SoapNoteRecord {
    id: string;
    condition: string;
    riskLevel: "low" | "moderate" | "high" | "emergency";
    subjective: string;
    objective: string;
    assessment: string;
    plan: string[];
    createdAt: string;
}

interface MedicationRecord {
    id: string;
    name: string;
    dosage?: string;
    form?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
    condition?: string;
    status: "active" | "completed" | "discontinued" | "paused";
    createdAt: string;
}

interface AssessmentRecord {
    id: string;
    riskLevel?: "low" | "moderate" | "high" | "emergency";
    createdAt: string;
    [key: string]: unknown;
}

interface BiomarkerRecord {
    name: string;
    value: number;
    unit: string;
    referenceRange?: string;
    status: "normal" | "low" | "high" | "critical";
}

interface BloodTestRecord {
    id: string;
    testName: string;
    testDate?: string;
    labName?: string;
    orderedBy?: string;
    biomarkers: BiomarkerRecord[];
    createdAt: string;
}

interface PatientHealthRecordsDto {
    patientId: string;
    patientName?: string;
    profile: ProfileLike | null;
    conditions: ConditionRecord[];
    soapNotes: SoapNoteRecord[];
    medications: MedicationRecord[];
    assessments: AssessmentRecord[];
    bloodTests: BloodTestRecord[];
}

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = Readonly<{ patientId: string }>;

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
    if (label === "Normal") return "BMI is within the healthy range (18.5\u201324.9).";
    if (label === "Underweight") return "BMI below 18.5 may indicate insufficient nutrition.";
    if (label === "Overweight") return "BMI of 25\u201329.9 is above ideal. Diet and exercise adjustments may help.";
    return "BMI of 30+ is classified as obese. A personalised plan is recommended.";
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

type RiskLevel = "low" | "moderate" | "high" | "emergency";
type Severity = "mild" | "moderate" | "severe" | "critical";
type BiomarkerStatus = "normal" | "low" | "high" | "critical";

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

// ── Clinical helpers ──────────────────────────────────────────────────────────

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

function riskDescription(risk: RiskLevel): string {
    const map: Record<RiskLevel, string> = {
        low: "No urgent concerns",
        moderate: "Monitor closely",
        high: "Needs attention soon",
        emergency: "Seek care immediately",
    };
    return map[risk];
}

// ── Reusable cards ────────────────────────────────────────────────────────────

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
            <Group gap={6} mb={8} wrap="nowrap">
                <ThemeIcon size={26} radius="md" color={color} variant="light" style={{ flexShrink: 0 }}>
                    {icon}
                </ThemeIcon>
                <Text size="xs" c="dimmed" fw={500} style={{ textTransform: "uppercase", letterSpacing: "0.5px", lineHeight: 1.2 }}>
                    {label}
                </Text>
            </Group>
            <Text fw={800} size="xl" lh={1} style={{ flex: 1, display: "flex", alignItems: "flex-end", paddingBottom: 6 }}>
                {value}
            </Text>
            <Text size="xs" c="dimmed" lh={1.4} style={{ minHeight: 28 }}>
                {description ?? ""}
            </Text>
        </Paper>
    );
}

function PatientSnapshotCard({ name, profile }: Readonly<{ name: string; profile: ProfileLike | undefined }>) {
    const age = computeAge(profile?.dateOfBirth);
    const bmi = computeBmi(profile?.height, profile?.weight);
    const bmiCat = bmi !== null ? bmiCategory(bmi) : null;
    const hasLocation = profile?.city ?? profile?.country;

    const vitals: Array<{ label: string; value: string; badge?: { label: string; color: string } }> = [
        { label: "Age", value: age !== null ? `${age} yrs` : "\u2014" },
        { label: "Height", value: profile?.height ? `${profile.height} cm` : "\u2014" },
        { label: "Weight", value: profile?.weight ? `${profile.weight} kg` : "\u2014" },
        { label: "BMI", value: bmi !== null ? String(bmi) : "\u2014", badge: bmiCat ?? undefined },
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
                    <Text size="xs" c="dimmed">Patient health overview</Text>
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

// ── Condition card (read-only) ────────────────────────────────────────────────

function ConditionCard({ condition }: Readonly<{ condition: ConditionRecord }>) {
    const [expanded, { toggle }] = useDisclosure(false);

    return (
        <Paper withBorder radius="lg" p="md">
            <Group justify="space-between" wrap="nowrap" gap="sm" align="flex-start">
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
                        <Text fw={600} size="sm" lineClamp={2}>{condition.name}</Text>
                        <Group gap={6} mt={4} wrap="wrap">
                            <Badge size="xs" variant="light" color={STATUS_COLOR[condition.status]} radius="sm">
                                {condition.status}
                            </Badge>
                            <Badge size="xs" variant="light" color={SEVERITY_COLOR[condition.severity]} radius="sm">
                                {condition.severity}
                            </Badge>
                            {condition.icd10 && (
                                <Text size="xs" c="dimmed" ff="monospace">ICD-10: {condition.icd10}</Text>
                            )}
                            <Text size="xs" c="dimmed">{formatDate(condition.createdAt)}</Text>
                        </Group>
                    </Box>
                </Group>
                <ActionIcon size={28} variant="subtle" color="gray" onClick={toggle} aria-label={expanded ? "Collapse" : "Expand"}>
                    {expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                </ActionIcon>
            </Group>
            <Collapse in={expanded}>
                <Divider my="sm" />
                <Stack gap="xs">
                    <Text size="sm" c="dimmed" lh={1.6}>{condition.description}</Text>
                    {condition.symptoms.length > 0 && (
                        <Box>
                            <Text size="xs" fw={600} c="dimmed" mb={4} style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                Symptoms
                            </Text>
                            <Group gap={6}>
                                {condition.symptoms.map((s) => (
                                    <Badge key={s} size="xs" variant="outline" color="gray" radius="sm">{s}</Badge>
                                ))}
                            </Group>
                        </Box>
                    )}
                </Stack>
            </Collapse>
        </Paper>
    );
}

// ── SOAP note card (read-only) ────────────────────────────────────────────────

function SoapNoteCard({ note }: Readonly<{ note: SoapNoteRecord }>) {
    const [expanded, { toggle }] = useDisclosure(false);

    return (
        <Paper withBorder radius="lg" p="md">
            <Group justify="space-between" wrap="nowrap" gap="sm" align="flex-start">
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
                        <Text fw={600} size="sm" lineClamp={2}>{note.condition}</Text>
                        <Group gap={6} mt={4} wrap="wrap">
                            <Badge size="xs" variant="light" color={RISK_COLOR[note.riskLevel]} radius="sm">
                                {note.riskLevel} risk
                            </Badge>
                            <Text size="xs" c="dimmed">{formatDate(note.createdAt)}</Text>
                        </Group>
                    </Box>
                </Group>
                <ActionIcon size={28} variant="subtle" color="gray" onClick={toggle} aria-label={expanded ? "Collapse" : "Expand"}>
                    {expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                </ActionIcon>
            </Group>
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

// ── Medication card (read-only) ───────────────────────────────────────────────

function MedicationCard({ med }: Readonly<{ med: MedicationRecord }>) {
    const statusColor = med.status === "active" ? colors.success
        : med.status === "paused" ? colors.warning
            : "gray";

    return (
        <Paper withBorder radius="lg" p="md">
            <Group gap="sm" wrap="nowrap" align="flex-start">
                <ThemeIcon size={36} radius="md" color="primary" variant="light" style={{ flexShrink: 0, marginTop: 2 }}>
                    <IconPill size={18} />
                </ThemeIcon>
                <Box style={{ minWidth: 0, flex: 1 }}>
                    <Text fw={600} size="sm" lineClamp={1}>{med.name}</Text>
                    <Group gap={6} mt={4} wrap="wrap">
                        <Badge size="xs" variant="light" color={statusColor} radius="sm">
                            {med.status}
                        </Badge>
                        {med.dosage && <Text size="xs" c="dimmed">{med.dosage}</Text>}
                        {med.frequency && <Text size="xs" c="dimmed">{med.frequency}</Text>}
                        {med.condition && (
                            <Badge size="xs" variant="outline" color="gray" radius="sm">{med.condition}</Badge>
                        )}
                        <Text size="xs" c="dimmed">{formatDate(med.createdAt)}</Text>
                    </Group>
                    {med.instructions && (
                        <Text size="xs" c="dimmed" mt={4} lh={1.5}>{med.instructions}</Text>
                    )}
                </Box>
            </Group>
        </Paper>
    );
}

// ── Blood test card (read-only) ───────────────────────────────────────────────

function BiomarkerRow({ b }: Readonly<{ b: BiomarkerRecord }>) {
    return (
        <Group justify="space-between" gap="xs" py={4}
            style={{ borderBottom: "1px solid light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))" }}
        >
            <Box style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={500} truncate>{b.name}</Text>
                {b.referenceRange && <Text size="xs" c="dimmed">Ref: {b.referenceRange}</Text>}
            </Box>
            <Group gap={6} wrap="nowrap" align="center">
                <Text size="sm" fw={600} c={BIOMARKER_STATUS_COLOR[b.status]}>
                    {b.value} {b.unit}
                </Text>
                <Badge
                    size="xs"
                    variant="light"
                    color={b.status === "normal" ? "teal" : b.status === "critical" ? "red" : "yellow"}
                    leftSection={BIOMARKER_STATUS_ICON[b.status]}
                >
                    {b.status}
                </Badge>
            </Group>
        </Group>
    );
}

function BloodTestCard({ record }: Readonly<{ record: BloodTestRecord }>) {
    const [expanded, { toggle }] = useDisclosure(false);
    const abnormalCount = record.biomarkers.filter((b) => b.status !== "normal").length;
    const criticalCount = record.biomarkers.filter((b) => b.status === "critical").length;

    return (
        <Paper withBorder radius="lg" p="md">
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
                    {record.testDate && <Text size="xs" c="dimmed">{formatDate(record.testDate)}</Text>}
                    {record.labName && <Text size="xs" c="dimmed">&middot; {record.labName}</Text>}
                    {record.orderedBy && <Text size="xs" c="dimmed">&middot; Dr. {record.orderedBy}</Text>}
                </Group>
                <Group gap={6} mt={8} wrap="wrap">
                    <Badge variant="light" size="xs" color="gray">
                        {record.biomarkers.length} parameters
                    </Badge>
                    {abnormalCount > 0 && (
                        <Badge variant="light" size="xs" color="yellow">{abnormalCount} abnormal</Badge>
                    )}
                    {criticalCount > 0 && (
                        <Badge variant="filled" size="xs" color="red">{criticalCount} critical</Badge>
                    )}
                </Group>
            </Box>
            {record.biomarkers.length > 0 && (
                <>
                    <Divider my="sm" />
                    <Text
                        size="xs"
                        fw={500}
                        c="primary"
                        style={{ cursor: "pointer" }}
                        onClick={toggle}
                    >
                        {expanded ? "Hide" : "Show"} {record.biomarkers.length} results
                        {expanded ? " \u25B2" : " \u25BC"}
                    </Text>
                    <Collapse in={expanded}>
                        <Stack gap={0} mt="xs">
                            {record.biomarkers.map((b, i) => (
                                <BiomarkerRow key={`${b.name}-${i}`} b={b} />
                            ))}
                        </Stack>
                    </Collapse>
                </>
            )}
        </Paper>
    );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

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
        </Stack>
    );
}

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
            <Text size="sm" c="dimmed" maw={300} mx="auto" lh={1.6}>{message}</Text>
        </Box>
    );
}

// ── Severity breakdown ────────────────────────────────────────────────────────

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

// ── Fetch helper ──────────────────────────────────────────────────────────────

async function fetchHealthRecords(patientId: string): Promise<PatientHealthRecordsDto> {
    const res = await fetch(`/api/doctor-patients/${patientId}/health-records`);
    if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(body.error?.message ?? "Failed to load health records");
    }
    return res.json() as Promise<PatientHealthRecordsDto>;
}

// ── Tab panels ────────────────────────────────────────────────────────────────

function OverviewPanel({ data }: Readonly<{ data: PatientHealthRecordsDto }>) {
    const { conditions, medications, soapNotes: notes, assessments, profile } = data;

    const hasAnyData =
        conditions.length > 0 ||
        medications.length > 0 ||
        notes.length > 0 ||
        assessments.length > 0;

    if (!hasAnyData && !profile?.height && !profile?.weight && !profile?.dateOfBirth) {
        return (
            <EmptyState
                icon={<IconHeartbeat size={32} />}
                message="This patient has no health data yet."
            />
        );
    }

    const highestRisk = getHighestRisk(notes, assessments);
    const confirmedConditions = conditions.filter((c) => c.status === "confirmed");
    const worstSeverity = getWorstSeverity(confirmedConditions);
    const activeMedications = medications.filter((m) => m.status === "active");
    const bmi = computeBmi(profile?.height, profile?.weight);
    const bmiCat = bmi !== null ? bmiCategory(bmi) : null;

    const kpis: Array<{ icon: ReactNode; label: string; value: string; color: string; description: string }> = [
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
            <PatientSnapshotCard
                name={data.patientName ?? "Patient"}
                profile={profile ?? undefined}
            />

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
                            <Text size="xs" c="dimmed" lh={1.5}>{bmiInsight(bmiCat.label)}</Text>
                        </Box>
                    </Group>
                </Paper>
            )}
        </Stack>
    );
}

function ConditionsPanel({ conditions }: Readonly<{ conditions: ConditionRecord[] }>) {
    if (conditions.length === 0) {
        return <EmptyState icon={<IconActivity size={32} />} message="No conditions recorded for this patient." />;
    }
    return (
        <Stack gap="sm">
            {conditions.map((c) => <ConditionCard key={c.id} condition={c} />)}
        </Stack>
    );
}

function SoapNotesPanel({ notes }: Readonly<{ notes: SoapNoteRecord[] }>) {
    if (notes.length === 0) {
        return <EmptyState icon={<IconNotes size={32} />} message="No SOAP notes recorded for this patient." />;
    }
    return (
        <Stack gap="sm">
            {notes.map((n) => <SoapNoteCard key={n.id} note={n} />)}
        </Stack>
    );
}

function MedicationsPanel({ medications }: Readonly<{ medications: MedicationRecord[] }>) {
    if (medications.length === 0) {
        return <EmptyState icon={<IconPill size={32} />} message="No medications recorded for this patient." />;
    }
    return (
        <Stack gap="sm">
            {medications.map((m) => <MedicationCard key={m.id} med={m} />)}
        </Stack>
    );
}

function BloodTestsPanel({ bloodTests }: Readonly<{ bloodTests: BloodTestRecord[] }>) {
    if (bloodTests.length === 0) {
        return <EmptyState icon={<IconFlask size={32} />} message="No blood tests recorded for this patient." />;
    }
    return (
        <Stack gap="sm">
            {bloodTests.map((r) => <BloodTestCard key={r.id} record={r} />)}
        </Stack>
    );
}

// ── Access denied state ───────────────────────────────────────────────────────

function AccessDenied() {
    const router = useRouter();
    return (
        <Box py={80} style={{ textAlign: "center" }}>
            <ThemeIcon size={64} radius="xl" color={colors.danger} variant="light" mx="auto" mb="md">
                <IconAlertCircle size={32} />
            </ThemeIcon>
            <Title order={4} mb="xs">Access Denied</Title>
            <Text size="sm" c="dimmed" maw={340} mx="auto" lh={1.6} mb="lg">
                You don&apos;t have consent to view this patient&apos;s health records.
                The patient must accept your invite first.
            </Text>
            <Tooltip label="Go back to patients list">
                <ActionIcon
                    variant="light"
                    size="lg"
                    color="primary"
                    onClick={() => router.push("/doctor/patients")}
                    mx="auto"
                    aria-label="Back to patients"
                >
                    <IconArrowLeft size={18} />
                </ActionIcon>
            </Tooltip>
        </Box>
    );
}

// ── Root content ──────────────────────────────────────────────────────────────

export function PatientHealthRecordsContent({ patientId }: Props) {
    const router = useRouter();

    const { data, isLoading, error } = useQuery({
        queryKey: ["doctor-patient-health-records", patientId] as const,
        queryFn: () => fetchHealthRecords(patientId),
    });

    const isAccessDenied =
        error?.message?.toLowerCase().includes("consent") ||
        error?.message?.toLowerCase().includes("forbidden");

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
                    <ActionIcon
                        variant="subtle"
                        color="gray"
                        onClick={() => router.push("/doctor/patients")}
                        aria-label="Back to patients"
                    >
                        <IconArrowLeft size={18} />
                    </ActionIcon>
                    <ThemeIcon size={36} radius="md" color="primary" variant="light">
                        <IconHeartbeat size={20} />
                    </ThemeIcon>
                    <Box>
                        <Title order={4} lh={1.2}>
                            {isLoading ? "Loading…" : (data?.patientName ?? "Patient")}
                        </Title>
                        <Text size="xs" c="dimmed">Health Records</Text>
                    </Box>
                </Group>
            </Box>

            {/* Error state */}
            {error && isAccessDenied && <AccessDenied />}

            {error && !isAccessDenied && (
                <Box p="xl" ta="center">
                    <Paper withBorder radius="lg" p="lg" style={{ borderColor: "var(--mantine-color-red-4)" }}>
                        <Group gap="sm" justify="center">
                            <IconAlertCircle size={18} color="var(--mantine-color-red-6)" />
                            <Text size="sm" c="red">
                                {error.message || "Failed to load health records. Please try again."}
                            </Text>
                        </Group>
                    </Paper>
                </Box>
            )}

            {/* Content */}
            {!error && (
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
                        <Tabs.Tab value="medications" leftSection={<IconPill size={14} />}>
                            Medications
                        </Tabs.Tab>
                        <Tabs.Tab value="blood-tests" leftSection={<IconFlask size={14} />}>
                            Blood Tests
                        </Tabs.Tab>
                    </Tabs.List>

                    <Box style={{ flex: 1, overflow: "hidden" }}>
                        <ScrollArea style={{ height: "100%" }}>
                            <Box px={{ base: "md", sm: "xl" }} py="lg" maw={800} mx="auto">
                                {isLoading && (
                                    <>
                                        <Tabs.Panel value="overview"><OverviewSkeletons /></Tabs.Panel>
                                        <Tabs.Panel value="conditions"><RecordSkeletons /></Tabs.Panel>
                                        <Tabs.Panel value="soap-notes"><RecordSkeletons /></Tabs.Panel>
                                        <Tabs.Panel value="medications"><RecordSkeletons /></Tabs.Panel>
                                        <Tabs.Panel value="blood-tests"><RecordSkeletons /></Tabs.Panel>
                                    </>
                                )}
                                {data && (
                                    <>
                                        <Tabs.Panel value="overview">
                                            <OverviewPanel data={data} />
                                        </Tabs.Panel>
                                        <Tabs.Panel value="conditions">
                                            <ConditionsPanel conditions={data.conditions} />
                                        </Tabs.Panel>
                                        <Tabs.Panel value="soap-notes">
                                            <SoapNotesPanel notes={data.soapNotes} />
                                        </Tabs.Panel>
                                        <Tabs.Panel value="medications">
                                            <MedicationsPanel medications={data.medications} />
                                        </Tabs.Panel>
                                        <Tabs.Panel value="blood-tests">
                                            <BloodTestsPanel bloodTests={data.bloodTests} />
                                        </Tabs.Panel>
                                    </>
                                )}
                            </Box>
                        </ScrollArea>
                    </Box>
                </Tabs>
            )}
        </Box>
    );
}
