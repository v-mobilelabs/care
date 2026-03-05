"use client";
import {
    ActionIcon,
    Alert,
    Badge,
    Box,
    Button,
    Chip,
    Collapse,
    Divider,
    Group,
    List,
    Loader,
    Paper,
    ScrollArea,
    SimpleGrid,
    Slider,
    Stack,
    Table,
    Tabs,
    Text,
    ThemeIcon,
    UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
    IconAlertTriangle,
    IconBookmark,
    IconBookmarkFilled,
    IconCalendar,
    IconCapsule,
    IconCheck,
    IconChecklist,
    IconChevronDown,
    IconCircleCheck,
    IconClipboardHeart,
    IconClock,
    IconCopy,
    IconDental,
    IconDentalBroken,
    IconDroplet,
    IconFlask,
    IconFlame,
    IconHeartbeat,
    IconLungs,
    IconMessageQuestion,
    IconMoodSad,
    IconMoodSmile,
    IconNotes,
    IconQuestionMark,
    IconSalad,
    IconScale,
    IconShieldCheck,
    IconStethoscope,
    IconThermometer,
    IconX,
} from "@tabler/icons-react";
import { useMantineColorScheme } from "@mantine/core";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { isToolUIPart } from "ai";
import type { UIMessagePart, UIDataTypes, UITools } from "ai";
import {
    SEVERITY_COLOR, RISK_COLOR, PRIORITY_COLOR, URGENCY_COLOR,
    getToolPartName, getToolPartState, extractToolInput,
} from "@/app/chat/_types";
import type {
    ConditionInput, PrescriptionInput, MedicineInput, ProcedureInput,
    AppointmentInput, ProviderInput, AssessmentInput, AskQuestionInput,
    NextStepsInput, DietPlanInput, SoapNoteInput,
    DentalChartInput, DentalCondition, DentalFinding, DentalMeasurements,
    SuggestActionsInput, SuggestActionItem, LogVitalsInput, PatientSummaryInput,
} from "@/app/chat/_types";
import { parseInline, MarkdownContent } from "@/app/chat/_components/markdown";
import { useAddDietPlanMutation, useAddMedicationMutation, useDietPlansQuery } from "@/app/chat/_query";
import { useChatContext } from "@/app/chat/_context/chat-context";

// ── Condition Card ─────────────────────────────────────────────────────────────

export function ConditionCard({ data, onLearnMore }: Readonly<{ data: ConditionInput; onLearnMore?: (text: string) => void }>) {
    const sevColor = SEVERITY_COLOR[data.severity];
    const sevLevel: Record<string, number> = { mild: 1, moderate: 2, severe: 3, critical: 4 };
    const filled = sevLevel[data.severity] ?? 1;
    const [opened, { toggle }] = useDisclosure(false);

    const statusConfig = {
        suspected: { color: "orange" as const, Icon: IconQuestionMark, label: "Suspected" },
        probable: { color: "yellow" as const, Icon: IconAlertTriangle, label: "Probable" },
        confirmed: { color: "teal" as const, Icon: IconCircleCheck, label: "Confirmed" },
    };
    const st = statusConfig[data.status] ?? statusConfig.suspected;
    const StatusIcon = st.Icon;

    return (
        <Paper
            withBorder
            radius="lg"
            p={0}
            style={{ overflow: "hidden", borderLeft: `4px solid var(--mantine-color-${sevColor}-5)` }}
        >
            {/* ── Compact header row — always visible ── */}
            <UnstyledButton
                onClick={toggle}
                style={{ width: "100%", display: "block" }}
                aria-expanded={opened}
            >
                <Box
                    px="md" py="sm"
                    style={{ background: `light-dark(var(--mantine-color-${sevColor}-0), rgba(0,0,0,0.2))` }}
                >
                    <Group gap="sm" wrap="nowrap" align="center">
                        <ThemeIcon size={32} radius="md" color={sevColor} variant="filled" style={{ flexShrink: 0 }}>
                            <IconStethoscope size={16} />
                        </ThemeIcon>

                        {/* Name + ICD10 */}
                        <Box style={{ flex: 1, minWidth: 0 }}>
                            <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1, marginBottom: 1 }}>Condition</Text>
                            <Text
                                fw={700}
                                size="sm"
                                style={{ lineHeight: 1.3, wordBreak: "break-word" }}
                            >
                                {data.name}
                            </Text>
                            {data.icd10 && (
                                <Text size="xs" c="dimmed" ff="monospace">{data.icd10}</Text>
                            )}
                        </Box>

                        {/* Badges + chevron */}
                        <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                            <Badge color={sevColor} size="xs" tt="capitalize" variant="filled">{data.severity}</Badge>
                            <Badge color={st.color} size="xs" tt="capitalize" variant="light"
                                leftSection={<StatusIcon size={9} />}
                            >
                                {st.label}
                            </Badge>
                            <ThemeIcon
                                size={20} radius="xl" color="gray" variant="subtle"
                                style={{
                                    transition: "transform 200ms ease",
                                    transform: opened ? "rotate(180deg)" : "rotate(0deg)",
                                }}
                            >
                                <IconChevronDown size={13} />
                            </ThemeIcon>
                        </Group>
                    </Group>
                </Box>
            </UnstyledButton>

            {/* ── Expandable body ── */}
            <Collapse in={opened}>
                <Box px="md" py="sm">
                    <Stack gap="sm">
                        {/* Severity meter */}
                        <Group gap={6} align="center" wrap="nowrap">
                            <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>Severity</Text>
                            <Group gap={4} wrap="nowrap" style={{ flex: 1 }}>
                                {[1, 2, 3, 4].map((n) => (
                                    <Box
                                        key={n}
                                        style={{
                                            flex: 1, height: 5, borderRadius: 3,
                                            background: n <= filled
                                                ? `var(--mantine-color-${sevColor}-${4 + n})`
                                                : "light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                                        }}
                                    />
                                ))}
                            </Group>
                            <Text size="xs" c={`${sevColor}.6`} fw={600} tt="capitalize" style={{ flexShrink: 0 }}>
                                {data.severity}
                            </Text>
                        </Group>

                        <Divider />

                        <Text size="sm" c="dimmed" style={{ lineHeight: 1.55 }}>
                            {data.description}
                        </Text>

                        {data.symptoms.length > 0 && (
                            <Box>
                                <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={6}
                                    style={{ letterSpacing: "0.5px" }}
                                >
                                    Key Symptoms
                                </Text>
                                <Group gap={6} wrap="wrap">
                                    {data.symptoms.map((s) => (
                                        <Badge key={s} size="sm" variant="light" color={sevColor}
                                            leftSection={<IconCheck size={9} />}
                                        >
                                            {s}
                                        </Badge>
                                    ))}
                                </Group>
                            </Box>
                        )}

                        {onLearnMore && (
                            <>
                                <Divider />
                                <Button
                                    size="xs"
                                    variant="subtle"
                                    color="primary"
                                    leftSection={<IconMessageQuestion size={13} />}
                                    onClick={() => onLearnMore(`Tell me more about ${data.name} — what causes it, how it progresses, and what I should know as a patient.`)}
                                    style={{ alignSelf: "flex-start" }}
                                >
                                    Ask about {data.name}
                                </Button>
                            </>
                        )}
                    </Stack>
                </Box>
            </Collapse>
        </Paper>
    );
}

// ── Prescription Card ──────────────────────────────────────────────────────────

export function PrescriptionCard({ data }: Readonly<{ data: PrescriptionInput }>) {
    const addMedication = useAddMedicationMutation();
    const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
    const [opened, { toggle }] = useDisclosure(false);

    function handleSaveMed(name: string, dosage: string, frequency: string, duration: string) {
        const key = `${name}:${dosage}`;
        if (savedIds.has(key)) return;
        addMedication.mutate(
            { name, dosage: dosage || undefined, frequency: frequency || undefined, duration: duration || undefined, condition: data.condition || undefined, status: "active" },
            {
                onSuccess: () => {
                    setSavedIds((prev) => { const s = new Set(prev); s.add(key); return s; });
                    notifications.show({ title: "Medication saved", message: `${name} added to your medications.`, color: "teal", icon: <IconCheck size={16} /> });
                },
            },
        );
    }

    return (
        <Paper withBorder radius="lg" p={0} style={{ overflow: "hidden", borderLeft: "4px solid var(--mantine-color-violet-5)" }}>
            <UnstyledButton onClick={toggle} style={{ width: "100%", display: "block" }} aria-expanded={opened}>
                <Box px="md" py="sm" style={{ background: "light-dark(var(--mantine-color-violet-0), rgba(0,0,0,0.2))" }}>
                    <Group gap="sm" wrap="nowrap" align="center">
                        <ThemeIcon size={32} radius="md" color="violet" variant="filled" style={{ flexShrink: 0 }}>
                            <IconClipboardHeart size={16} />
                        </ThemeIcon>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                            <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1, marginBottom: 1 }}>Prescription</Text>
                            <Text fw={700} size="sm" style={{ lineHeight: 1.3 }}>{data.title}</Text>
                            <Text size="xs" c="dimmed">{data.condition}</Text>
                        </Box>
                        <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                            <Badge size="xs" color="violet" variant="light">{data.medications.length} med{data.medications.length !== 1 ? "s" : ""}</Badge>
                            {data.urgent && <Badge color="red" size="xs" variant="filled">Urgent</Badge>}
                            <ThemeIcon size={20} radius="xl" color="gray" variant="subtle"
                                style={{ transition: "transform 200ms ease", transform: opened ? "rotate(180deg)" : "rotate(0deg)" }}>
                                <IconChevronDown size={13} />
                            </ThemeIcon>
                        </Group>
                    </Group>
                </Box>
            </UnstyledButton>
            <Collapse in={opened}>
                <Box px="md" py="sm">
                    <Box style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                        <Table verticalSpacing="xs" fz="sm" withTableBorder withColumnBorders style={{ minWidth: 380 }}>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Medication</Table.Th>
                                    <Table.Th>Dosage</Table.Th>
                                    <Table.Th>Frequency</Table.Th>
                                    <Table.Th>Duration</Table.Th>
                                    <Table.Th></Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {data.medications.map((m) => {
                                    const key = `${m.name}:${m.dosage}`;
                                    const saved = savedIds.has(key);
                                    return (
                                        <Table.Tr key={key}>
                                            <Table.Td>
                                                <Group gap={6}><IconCapsule size={13} /><Text size="sm" fw={500}>{m.name}</Text><Badge size="xs" variant="dot" color="gray">{m.form}</Badge></Group>
                                            </Table.Td>
                                            <Table.Td>{m.dosage}</Table.Td>
                                            <Table.Td>{m.frequency}</Table.Td>
                                            <Table.Td>{m.duration}</Table.Td>
                                            <Table.Td>
                                                <ActionIcon
                                                    size={22}
                                                    variant={saved ? "filled" : "subtle"}
                                                    color={saved ? "teal" : "gray"}
                                                    onClick={() => handleSaveMed(m.name, m.dosage, m.frequency, m.duration)}
                                                    disabled={saved || addMedication.isPending}
                                                    title={saved ? "Saved to my medications" : "Save to my medications"}
                                                >
                                                    {saved ? <IconBookmarkFilled size={12} /> : <IconBookmark size={12} />}
                                                </ActionIcon>
                                            </Table.Td>
                                        </Table.Tr>
                                    );
                                })}
                            </Table.Tbody>
                        </Table>
                        {data.notes && <Text size="xs" c="dimmed" mt={6}>📝 {data.notes}</Text>}
                    </Box>
                </Box>
            </Collapse>
        </Paper>
    );
}

// ── Medicine Card ──────────────────────────────────────────────────────────────

export function MedicineCard({ data }: Readonly<{ data: MedicineInput }>) {
    const addMedication = useAddMedicationMutation();
    const [saved, setSaved] = useState(false);

    function handleSave() {
        if (saved) return;
        addMedication.mutate(
            { name: data.name, dosage: data.dosage || undefined, frequency: data.frequency || undefined, duration: data.duration || undefined, instructions: data.notes || undefined, status: "active" },
            {
                onSuccess: () => {
                    setSaved(true);
                    notifications.show({ title: "Medication saved", message: `${data.name} added to your medications.`, color: "teal", icon: <IconCheck size={16} /> });
                },
            },
        );
    }

    const [opened, { toggle }] = useDisclosure(false);

    return (
        <Paper withBorder radius="lg" p={0} style={{ overflow: "hidden", borderLeft: "4px solid var(--mantine-color-teal-5)" }}>
            <Box
                px="md" py="sm"
                style={{ background: "light-dark(var(--mantine-color-teal-0), rgba(0,0,0,0.2))", cursor: "pointer" }}
                onClick={toggle}
                aria-expanded={opened}
            >
                <Group gap="sm" wrap="nowrap" align="center">
                    <ThemeIcon size={32} radius="md" color="teal" variant="filled" style={{ flexShrink: 0 }}>
                        <IconCapsule size={16} />
                    </ThemeIcon>
                    <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1, marginBottom: 1 }}>Medication</Text>
                        <Group gap={6} wrap="nowrap">
                            <Text fw={700} size="sm" style={{ lineHeight: 1.3 }}>{data.name}</Text>
                            <Badge size="xs" color="teal" variant="light" style={{ flexShrink: 0 }}>{data.category}</Badge>
                        </Group>
                    </Box>
                    <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                        <ActionIcon
                            size={26}
                            variant={saved ? "filled" : "subtle"}
                            color={saved ? "teal" : "gray"}
                            onClick={(e) => { e.stopPropagation(); handleSave(); }}
                            disabled={saved || addMedication.isPending}
                            loading={addMedication.isPending}
                            title={saved ? "Saved" : "Save to medications"}
                        >
                            {saved ? <IconBookmarkFilled size={13} /> : <IconBookmark size={13} />}
                        </ActionIcon>
                        <ThemeIcon size={20} radius="xl" color="gray" variant="subtle"
                            style={{ transition: "transform 200ms ease", transform: opened ? "rotate(180deg)" : "rotate(0deg)" }}>
                            <IconChevronDown size={13} />
                        </ThemeIcon>
                    </Group>
                </Group>
            </Box>
            <Collapse in={opened}>
                <Box px="md" py="sm">
                    <Stack gap="xs">
                        <Text size="xs" c="dimmed" lh={1.5}>{data.indication}</Text>
                        <Group gap={6} wrap="wrap">
                            <Badge size="sm" color="teal" variant="outline">{data.dosage}</Badge>
                            <Badge size="sm" color="gray" variant="outline">{data.frequency}</Badge>
                            {data.duration && <Badge size="sm" color="gray" variant="outline">{data.duration}</Badge>}
                        </Group>
                        {data.warnings && data.warnings.length > 0 && (
                            <Group gap={4} wrap="wrap">
                                {data.warnings.map((w) => <Badge key={w} size="xs" color="orange" variant="light">⚠ {w}</Badge>)}
                            </Group>
                        )}
                    </Stack>
                </Box>
            </Collapse>
        </Paper>
    );
}

// ── Procedure Card ─────────────────────────────────────────────────────────────

export function ProcedureCard({ data }: Readonly<{ data: ProcedureInput }>) {
    const pc = PRIORITY_COLOR[data.priority];
    const [opened, { toggle }] = useDisclosure(false);
    return (
        <Paper withBorder radius="lg" p={0} style={{ overflow: "hidden", borderLeft: `4px solid var(--mantine-color-${pc}-5)` }}>
            <UnstyledButton onClick={toggle} style={{ width: "100%", display: "block" }} aria-expanded={opened}>
                <Box px="md" py="sm" style={{ background: `light-dark(var(--mantine-color-${pc}-0), rgba(0,0,0,0.2))` }}>
                    <Group gap="sm" wrap="nowrap" align="center">
                        <ThemeIcon size={32} radius="md" color="blue" variant="filled" style={{ flexShrink: 0 }}>
                            <IconFlask size={16} />
                        </ThemeIcon>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                            <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1, marginBottom: 1 }}>Procedure / Test</Text>
                            <Group gap={6} wrap="nowrap">
                                <Text fw={700} size="sm" style={{ lineHeight: 1.3 }}>{data.name}</Text>
                                <Badge size="xs" variant="dot" color="gray" tt="capitalize" style={{ flexShrink: 0 }}>{data.type}</Badge>
                            </Group>
                        </Box>
                        <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                            <Badge color={pc} size="xs" tt="capitalize" variant="filled">{data.priority}</Badge>
                            <ThemeIcon size={20} radius="xl" color="gray" variant="subtle"
                                style={{ transition: "transform 200ms ease", transform: opened ? "rotate(180deg)" : "rotate(0deg)" }}>
                                <IconChevronDown size={13} />
                            </ThemeIcon>
                        </Group>
                    </Group>
                </Box>
            </UnstyledButton>
            <Collapse in={opened}>
                <Box px="md" py="sm">
                    <Stack gap="xs">
                        <Text size="sm" c="dimmed" lh={1.55}>{data.indication}</Text>
                        {data.preparation && (
                            <Alert color="yellow" variant="light" p="xs" radius="md" icon={<IconAlertTriangle size={13} />}>
                                <Text size="xs"><strong>Prep:</strong> {data.preparation}</Text>
                            </Alert>
                        )}
                    </Stack>
                </Box>
            </Collapse>
        </Paper>
    );
}

// ── Appointment Card ───────────────────────────────────────────────────────────

export function AppointmentCard({ data }: Readonly<{ data: AppointmentInput }>) {
    const [opened, { toggle }] = useDisclosure(false);
    return (
        <Paper withBorder radius="lg" p={0} style={{ overflow: "hidden", borderLeft: "4px solid var(--mantine-color-indigo-5)" }}>
            <UnstyledButton onClick={toggle} style={{ width: "100%", display: "block" }} aria-expanded={opened}>
                <Box px="md" py="sm" style={{ background: "light-dark(var(--mantine-color-indigo-0), rgba(0,0,0,0.2))" }}>
                    <Group gap="sm" wrap="nowrap" align="center">
                        <ThemeIcon size={32} radius="md" color="indigo" variant="filled" style={{ flexShrink: 0 }}>
                            <IconCalendar size={16} />
                        </ThemeIcon>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                            <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1, marginBottom: 1 }}>Appointment</Text>
                            <Text fw={700} size="sm" style={{ lineHeight: 1.3 }}>{data.specialty}</Text>
                        </Box>
                        <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                            <Badge color="indigo" size="xs" variant="filled" tt="capitalize">{data.visitType}</Badge>
                            <Badge color="orange" size="xs" variant="light">{data.urgency}</Badge>
                            <ThemeIcon size={20} radius="xl" color="gray" variant="subtle"
                                style={{ transition: "transform 200ms ease", transform: opened ? "rotate(180deg)" : "rotate(0deg)" }}>
                                <IconChevronDown size={13} />
                            </ThemeIcon>
                        </Group>
                    </Group>
                </Box>
            </UnstyledButton>
            <Collapse in={opened}>
                <Box px="md" py="sm">
                    <Stack gap="xs">
                        <Text size="sm" c="dimmed" lh={1.55}>{data.reason}</Text>
                        {data.notes && <Text size="xs" c="dimmed">📝 {data.notes}</Text>}
                    </Stack>
                </Box>
            </Collapse>
        </Paper>
    );
}

// ── Provider Card ──────────────────────────────────────────────────────────────

export function ProviderCard({ data }: Readonly<{ data: ProviderInput }>) {
    const uc = URGENCY_COLOR[data.urgency];
    return (
        <Paper withBorder radius="lg" p="md">
            <Group gap="xs" align="flex-start">
                <ThemeIcon size={28} radius="md" color="cyan" variant="light" mt={2}><IconStethoscope size={15} /></ThemeIcon>
                <Box style={{ flex: 1 }}>
                    <Group justify="space-between" wrap="nowrap">
                        <Box>
                            <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1, marginBottom: 1 }}>Specialist</Text>
                            <Group gap={6}>
                                <Text fw={700} size="sm">{data.role}</Text>
                                {data.specialty && <Badge size="xs" variant="dot" color="gray">{data.specialty}</Badge>}
                            </Group>
                        </Box>
                        <Badge color={uc} size="sm" tt="capitalize">{data.urgency}</Badge>
                    </Group>
                    <Text size="sm" c="dimmed" mt={2}>{data.reason}</Text>
                    {data.notes && <Text size="xs" c="dimmed" mt={4}>📝 {data.notes}</Text>}
                </Box>
            </Group>
        </Paper>
    );
}

// ── Assessment Complete Card ───────────────────────────────────────────────────

export function AssessmentCompleteCard({ data }: Readonly<{ data: AssessmentInput }>) {
    const rc = RISK_COLOR[data.riskLevel];
    const [opened, { toggle }] = useDisclosure(false);
    return (
        <Paper withBorder radius="lg" p={0} style={{ overflow: "hidden", borderLeft: `4px solid var(--mantine-color-${rc}-5)` }}>
            <UnstyledButton onClick={toggle} style={{ width: "100%", display: "block" }} aria-expanded={opened}>
                <Box px="md" py="sm" style={{ background: `light-dark(var(--mantine-color-${rc}-0), rgba(0,0,0,0.2))` }}>
                    <Group gap="sm" wrap="nowrap" align="center">
                        <ThemeIcon size={32} radius="md" color={rc} variant="filled" style={{ flexShrink: 0 }}>
                            <IconShieldCheck size={16} />
                        </ThemeIcon>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                            <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1, marginBottom: 1 }}>Assessment</Text>
                            <Text fw={700} size="sm" style={{ lineHeight: 1.3 }}>
                                {data.primaryDiagnosis ?? "Complete"}
                            </Text>
                        </Box>
                        <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                            <Badge color={rc} size="xs" variant="filled" tt="uppercase">{data.riskLevel} risk</Badge>
                            <ThemeIcon size={20} radius="xl" color="gray" variant="subtle"
                                style={{ transition: "transform 200ms ease", transform: opened ? "rotate(180deg)" : "rotate(0deg)" }}>
                                <IconChevronDown size={13} />
                            </ThemeIcon>
                        </Group>
                    </Group>
                </Box>
            </UnstyledButton>
            <Collapse in={opened}>
                <Box px="md" py="sm">
                    <Stack gap="sm">
                        <Text size="sm" lh={1.55}>{data.summary}</Text>
                        {data.immediateActions.length > 0 && (
                            <Box>
                                <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.5px" }} mb={6}>Immediate Steps</Text>
                                <List size="sm" spacing={4}
                                    icon={<ThemeIcon size={16} radius="xl" color={rc} variant="light"><IconCircleCheck size={10} /></ThemeIcon>}>
                                    {data.immediateActions.map((action) => <List.Item key={action}>{action}</List.Item>)}
                                </List>
                            </Box>
                        )}
                        <Divider />
                        <Text size="xs" c="dimmed" lh={1.5}>{data.disclaimer}</Text>
                    </Stack>
                </Box>
            </Collapse>
        </Paper>
    );
}

// ── Option icon mapping ──────────────────────────────────────────────────────

function getTemperatureIcon(t: string): ReactNode | null {
    if (t.startsWith("normal")) return <IconThermometer size={14} />;
    if (t.startsWith("low-grade")) return <IconThermometer size={14} />;
    if (t.startsWith("high fever")) return <IconFlame size={14} />;
    if (t.startsWith("very high")) return <IconAlertTriangle size={14} />;
    if (/haven.?t measured|haven.?t checked|not measured|didn.?t check/.test(t)) return <IconQuestionMark size={14} />;
    return null;
}

function getPainIcon(t: string): ReactNode | null {
    if (t.startsWith("sharp")) return <IconAlertTriangle size={14} />;
    if (t.startsWith("dull")) return <IconScale size={14} />;
    if (t.startsWith("burning")) return <IconFlame size={14} />;
    if (t.startsWith("throbbing")) return <IconHeartbeat size={14} />;
    if (t.startsWith("cramping")) return <IconDroplet size={14} />;
    if (t.startsWith("pressure")) return <IconHeartbeat size={14} />;
    return null;
}

function getSeverityIcon(t: string): ReactNode | null {
    if (t === "mild") return <IconMoodSmile size={14} />;
    if (t === "moderate") return <IconScale size={14} />;
    if (t === "severe") return <IconMoodSad size={14} />;
    if (t.startsWith("sudden")) return <IconAlertTriangle size={14} />;
    if (t.startsWith("gradual") || t.startsWith("chronic")) return <IconClock size={14} />;
    return null;
}

function getOptionIcon(opt: string): ReactNode | null {
    const t = opt.toLowerCase();
    return getTemperatureIcon(t) ?? getPainIcon(t) ?? getSeverityIcon(t);
}

// ── Question Card ─────────────────────────────────────────────────────────────

interface QuestionCardProps {
    data: AskQuestionInput;
    toolCallId: string;
    isAnswered: boolean;
    isLoading: boolean;
    onAnswer: (toolCallId: string, answer: string) => void;
}

export function QuestionCard({ data, toolCallId, isAnswered, isLoading, onAnswer }: Readonly<QuestionCardProps>) {
    const [multiSelected, setMultiSelected] = useState<string[]>([]);
    const [scaleValue, setScaleValue] = useState<number>(data.scaleMin ?? 0);
    const disabled = isAnswered || isLoading;

    const scaleMarks = [
        { value: data.scaleMin ?? 0 },
        { value: data.scaleMax ?? 10 },
    ];

    return (
        <Paper withBorder radius="lg" p="md" style={{ borderLeft: "4px solid var(--mantine-color-primary-5)" }}>
            <Stack gap="md">
                <Group gap="xs" justify="space-between" wrap="nowrap">
                    <Group gap="xs">
                        <ThemeIcon size={28} radius="md" color="primary" variant="light"><IconQuestionMark size={15} /></ThemeIcon>
                        <Text fw={600} size="sm">{data.question}</Text>
                    </Group>
                    {isAnswered && <Badge color="teal" size="sm" variant="light" leftSection={<IconCheck size={10} />}>Answered</Badge>}
                </Group>

                {data.type === "yes_no" && (
                    <Group gap="sm" grow>
                        <Button size="sm" color="teal" variant={disabled ? "outline" : "filled"} disabled={disabled} leftSection={<IconCheck size={14} />} onClick={() => onAnswer(toolCallId, "Yes")}>Yes</Button>
                        <Button size="sm" color="red" variant={disabled ? "outline" : "light"} disabled={disabled} leftSection={<IconX size={14} />} onClick={() => onAnswer(toolCallId, "No")}>No</Button>
                    </Group>
                )}

                {data.type === "single_choice" && data.options && (
                    <Chip.Group>
                        <Group gap="xs" wrap="wrap">
                            {data.options.map((opt) => {
                                const icon = getOptionIcon(opt);
                                return (
                                    <Chip
                                        key={opt}
                                        value={opt}
                                        color="primary"
                                        variant="outline"
                                        size="md"
                                        radius="xl"
                                        disabled={disabled}
                                        checked={false}
                                        onChange={() => { if (!disabled) onAnswer(toolCallId, opt); }}
                                        styles={{ label: { cursor: disabled ? "default" : "pointer", fontWeight: 500 } }}
                                    >
                                        {icon ? <Group gap={5} wrap="nowrap">{icon}{opt}</Group> : opt}
                                    </Chip>
                                );
                            })}
                        </Group>
                    </Chip.Group>
                )}

                {data.type === "multi_choice" && data.options && (
                    <Stack gap="sm">
                        <Chip.Group multiple value={multiSelected} onChange={disabled ? undefined : setMultiSelected}>
                            <Group gap="xs" wrap="wrap">
                                {data.options.map((opt) => {
                                    const icon = getOptionIcon(opt);
                                    return (
                                        <Chip
                                            key={opt}
                                            value={opt}
                                            color="primary"
                                            variant="outline"
                                            size="md"
                                            radius="xl"
                                            disabled={disabled}
                                            styles={{ label: { cursor: disabled ? "default" : "pointer", fontWeight: 500 } }}
                                        >
                                            {icon ? <Group gap={5} wrap="nowrap">{icon}{opt}</Group> : opt}
                                        </Chip>
                                    );
                                })}
                            </Group>
                        </Chip.Group>
                        {!disabled && (
                            <Group justify="flex-end">
                                <Button size="sm" color="primary" disabled={multiSelected.length === 0} onClick={() => onAnswer(toolCallId, multiSelected.join(", "))}>
                                    Confirm selection
                                </Button>
                            </Group>
                        )}
                    </Stack>
                )}

                {data.type === "scale" && (
                    <Stack gap="md">
                        <Stack gap={4}>
                            <Slider min={data.scaleMin ?? 0} max={data.scaleMax ?? 10} step={1} value={scaleValue} onChange={setScaleValue} disabled={disabled} marks={scaleMarks} color="primary" />
                            <Group justify="space-between" mt="xs">
                                <Text size="xs" c="dimmed">{data.scaleMinLabel ?? String(data.scaleMin ?? 0)}</Text>
                                <Text size="xs" c="dimmed">{data.scaleMaxLabel ?? String(data.scaleMax ?? 10)}</Text>
                            </Group>
                        </Stack>
                        {!disabled && (
                            <Group justify="flex-end">
                                <Button size="sm" color="primary" onClick={() => onAnswer(toolCallId, String(scaleValue))}>Submit: {scaleValue}</Button>
                            </Group>
                        )}
                    </Stack>
                )}

                {data.type === "free_text" && !isAnswered && (
                    <Text size="xs" c="dimmed" fs="italic">↓ Type your answer in the chat bar below</Text>
                )}
            </Stack>
        </Paper>
    );
}

// ── Next Steps Card ───────────────────────────────────────────────────────────

export function NextStepsCard({ data }: Readonly<{ data: NextStepsInput }>) {
    const [moreOpen, { toggle: toggleMore }] = useDisclosure(false);
    const hasMore = data.shortTerm.length > 0 || data.longTerm.length > 0;

    return (
        <Paper withBorder radius="lg" p={0} style={{ overflow: "hidden", borderLeft: "4px solid var(--mantine-color-primary-5)" }}>
            {/* ── Red flags — always first, impossible to miss ── */}
            {data.redFlags.length > 0 && (
                <Alert
                    color="red"
                    radius={0}
                    icon={<IconAlertTriangle size={16} />}
                    title="Seek emergency care immediately if you experience:"
                    styles={{ title: { marginBottom: 4 }, body: { gap: 4 } }}
                >
                    <List size="sm" spacing={3}>
                        {data.redFlags.map((s, i) => <List.Item key={i}>{s}</List.Item>)}
                    </List>
                </Alert>
            )}

            <Box px="md" pt="md" pb={hasMore ? "xs" : "md"}>
                <Stack gap="sm">
                    <Group gap="xs">
                        <ThemeIcon size={28} radius="md" color="primary" variant="light"><IconChecklist size={15} /></ThemeIcon>
                        <Box>
                            <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1, marginBottom: 1 }}>Next Steps</Text>
                            <Text fw={700} size="sm">{data.condition}</Text>
                        </Box>
                    </Group>

                    {/* Right Now — always visible */}
                    {data.immediate.length > 0 && (
                        <Box pl={36}>
                            <Text size="xs" fw={700} c="orange" tt="uppercase" style={{ letterSpacing: "0.5px" }} mb={6}>Right now</Text>
                            <List size="sm" spacing={5}>
                                {data.immediate.map((s, i) => <List.Item key={i}>{s}</List.Item>)}
                            </List>
                        </Box>
                    )}

                    {/* Short-term + Long-term — collapsed by default */}
                    {hasMore && (
                        <Collapse in={moreOpen}>
                            <Stack gap="sm" pl={36}>
                                {data.shortTerm.length > 0 && (
                                    <Box>
                                        <Text size="xs" fw={700} c="blue" tt="uppercase" style={{ letterSpacing: "0.5px" }} mb={6}>Next few weeks</Text>
                                        <List size="sm" spacing={5}>
                                            {data.shortTerm.map((s, i) => <List.Item key={i}>{s}</List.Item>)}
                                        </List>
                                    </Box>
                                )}
                                {data.longTerm.length > 0 && (
                                    <Box>
                                        <Text size="xs" fw={700} c="teal" tt="uppercase" style={{ letterSpacing: "0.5px" }} mb={6}>Ongoing</Text>
                                        <List size="sm" spacing={5}>
                                            {data.longTerm.map((s, i) => <List.Item key={i}>{s}</List.Item>)}
                                        </List>
                                    </Box>
                                )}
                            </Stack>
                        </Collapse>
                    )}
                </Stack>
            </Box>

            {/* Show more / less toggle */}
            {hasMore && (
                <UnstyledButton
                    onClick={toggleMore}
                    style={{
                        width: "100%",
                        padding: "8px 16px",
                        borderTop: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-4))",
                        background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                    }}
                >
                    <Text size="xs" c="dimmed" fw={500}>{moreOpen ? "Show less" : `Show ${data.shortTerm.length + data.longTerm.length} more steps`}</Text>
                    <IconChevronDown size={13} color="var(--mantine-color-dimmed)" style={{ transform: moreOpen ? "rotate(180deg)" : "none", transition: "transform 150ms ease" }} />
                </UnstyledButton>
            )}
        </Paper>
    );
}

// ── Diet Plan Card ────────────────────────────────────────────────────────────

export function DietPlanCard({ data }: Readonly<{ data: DietPlanInput }>) {
    const addDietPlan = useAddDietPlanMutation();
    const { sessionId } = useChatContext();
    const { data: allPlans = [] } = useDietPlansQuery();
    const [guideOpen, { toggle: toggleGuide }] = useDisclosure(false);
    const autoSavedRef = useRef(false);

    // Determine if a plan already exists for this session (e.g. page reload)
    const existingPlan = allPlans.find((p) => p.sessionId === sessionId);
    const [saved, setSaved] = useState(!!existingPlan);

    const days = data.weeklyPlan ?? [];
    const firstDay = days[0]?.day ?? "Monday";
    const [activeDay, setActiveDay] = useState(firstDay);

    // Auto-save (upsert) as soon as the plan card mounts.
    // Skipped if a plan already exists for this session (e.g. on page reload).
    useEffect(() => {
        if (autoSavedRef.current || existingPlan) return;
        autoSavedRef.current = true;
        addDietPlan.mutate(
            {
                sessionId,
                condition: data.condition,
                overview: data.overview,
                weeklyWeightLossEstimate: data.weeklyWeightLossEstimate,
                totalDailyCalories: data.totalDailyCalories,
                weeklyPlan: data.weeklyPlan,
                recommended: data.recommended,
                avoid: data.avoid,
                tips: data.tips,
            },
            {
                onSuccess: () => {
                    setSaved(true);
                    notifications.show({ title: "Diet plan saved", message: "Plan saved to your Diet Plans.", color: "teal", icon: <IconCheck size={16} /> });
                },
            },
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const selectedDay = days.find((d) => d.day === activeDay) ?? days[0];

    const MEAL_COLORS: Record<string, string> = {
        Breakfast: "orange",
        "Morning Snack": "yellow",
        Lunch: "blue",
        "Afternoon Snack": "grape",
        Dinner: "indigo",
    };

    function handleSave() {
        if (saved) return;
        addDietPlan.mutate(
            {
                sessionId,
                condition: data.condition,
                overview: data.overview,
                weeklyWeightLossEstimate: data.weeklyWeightLossEstimate,
                totalDailyCalories: data.totalDailyCalories,
                weeklyPlan: data.weeklyPlan,
                recommended: data.recommended,
                avoid: data.avoid,
                tips: data.tips,
            },
            {
                onSuccess: () => {
                    setSaved(true);
                    notifications.show({ title: "Diet plan saved", message: "Plan saved to your Diet Plans.", color: "teal", icon: <IconCheck size={16} /> });
                },
            },
        );
    }

    return (
        <Paper withBorder radius="lg" p={0} style={{ overflow: "hidden", borderLeft: "4px solid var(--mantine-color-green-5)" }}>

            {/* ── Header ── */}
            <Box
                px="md" pt="md" pb="sm"
                style={{ background: "light-dark(var(--mantine-color-green-0), rgba(0,0,0,0.2))" }}
            >
                <Group justify="space-between" wrap="nowrap" align="flex-start">
                    <Group gap="sm" wrap="nowrap" align="flex-start" style={{ flex: 1, minWidth: 0 }}>
                        <ThemeIcon size={40} radius="md" color="green" variant="filled" style={{ flexShrink: 0, marginTop: 2 }}>
                            <IconSalad size={22} />
                        </ThemeIcon>
                        <Box style={{ minWidth: 0 }}>
                            <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1, marginBottom: 1 }}>Diet Plan</Text>
                            <Text fw={700} size="sm" lh={1.2}>{data.condition}</Text>
                            <Group gap={6} wrap="wrap" mt={4}>
                                {data.weeklyWeightLossEstimate && (
                                    <Badge size="xs" color="green" variant="filled" radius="sm" leftSection={<IconScale size={10} />}>
                                        {data.weeklyWeightLossEstimate}
                                    </Badge>
                                )}
                                {data.totalDailyCalories != null && data.totalDailyCalories > 0 && (
                                    <Badge size="xs" color="orange" variant="light" radius="sm" leftSection={<IconFlame size={10} />}>
                                        {data.totalDailyCalories} kcal/day
                                    </Badge>
                                )}
                            </Group>
                        </Box>
                    </Group>
                    <ActionIcon
                        size={32}
                        variant={saved ? "filled" : "subtle"}
                        color={saved ? "teal" : "gray"}
                        onClick={handleSave}
                        disabled={saved || addDietPlan.isPending}
                        loading={addDietPlan.isPending}
                        title={saved ? "Saved" : "Save plan"}
                        style={{ flexShrink: 0 }}
                    >
                        {saved ? <IconBookmarkFilled size={16} /> : <IconBookmark size={16} />}
                    </ActionIcon>
                </Group>
            </Box>

            {/* ── Overview ── */}
            <Box px="md" py="sm" style={{ borderBottom: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))" }}>
                <Text size="sm" c="dimmed" lh={1.6}>{data.overview}</Text>
            </Box>

            {/* ── Day tabs (Mon–Sun) ── */}
            {days.length > 0 && (
                <Box>
                    <ScrollArea type="never" offsetScrollbars={false}>
                        <Tabs
                            value={activeDay}
                            onChange={(v) => { if (v) setActiveDay(v); }}
                            variant="pills"
                            styles={{
                                list: { gap: 4, padding: "10px 12px", flexWrap: "nowrap", borderBottom: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))" },
                                tab: { paddingInline: 10, paddingBlock: 4, fontSize: "0.75rem", fontWeight: 600 },
                            }}
                        >
                            <Tabs.List>
                                {days.map((d) => (
                                    <Tabs.Tab key={d.day} value={d.day}>
                                        {d.day.slice(0, 3)}
                                    </Tabs.Tab>
                                ))}
                            </Tabs.List>
                        </Tabs>
                    </ScrollArea>

                    {/* Selected day meals */}
                    {selectedDay && (
                        <Stack gap={0} px="md" py="sm">
                            <Group justify="space-between" mb="sm">
                                <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.5px" }}>
                                    {selectedDay.day}
                                </Text>
                                <Badge size="sm" color="orange" variant="light" leftSection={<IconFlame size={11} />}>
                                    {selectedDay.totalCalories} kcal total
                                </Badge>
                            </Group>

                            <Stack gap="xs">
                                {selectedDay.meals.map((meal) => {
                                    const mealColor = MEAL_COLORS[meal.name] ?? "green";
                                    return (
                                        <Paper key={meal.name} withBorder radius="md" p={0} style={{ overflow: "hidden" }}>
                                            {/* Meal header */}
                                            <Box
                                                px="sm" py={6}
                                                style={{ background: `light-dark(var(--mantine-color-${mealColor}-0), rgba(0,0,0,0.15))` }}
                                            >
                                                <Group justify="space-between" wrap="nowrap">
                                                    <Group gap={6}>
                                                        <ThemeIcon size={22} radius="sm" color={mealColor} variant="light">
                                                            <IconClock size={13} />
                                                        </ThemeIcon>
                                                        <Text size="xs" fw={700}>{meal.name}</Text>
                                                        <Text size="xs" c="dimmed">{meal.time}</Text>
                                                    </Group>
                                                    <Badge size="xs" color={mealColor} variant="light">
                                                        {meal.totalCalories} kcal
                                                    </Badge>
                                                </Group>
                                            </Box>
                                            {/* Foods */}
                                            <Stack gap={0}>
                                                {meal.foods.map((food, fi) => (
                                                    <Box
                                                        key={food.item}
                                                        px="sm" py={6}
                                                        style={{
                                                            borderTop: fi > 0 ? "1px solid light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))" : undefined,
                                                        }}
                                                    >
                                                        <Group justify="space-between" wrap="nowrap" gap="xs">
                                                            <Box style={{ flex: 1, minWidth: 0 }}>
                                                                <Text size="sm" fw={500} lh={1.3}>{food.item}</Text>
                                                                <Text size="xs" c="dimmed">{food.portion}</Text>
                                                            </Box>
                                                            <Badge size="sm" color="gray" variant="outline" style={{ flexShrink: 0 }}>
                                                                {food.calories} kcal
                                                            </Badge>
                                                        </Group>
                                                    </Box>
                                                ))}
                                            </Stack>
                                        </Paper>
                                    );
                                })}
                            </Stack>
                        </Stack>
                    )}
                </Box>
            )}

            {/* ── Diet guide (foods to eat/avoid + tips) ── */}
            {(data.recommended.length > 0 || data.avoid.length > 0 || data.tips.length > 0) && (
                <Box style={{ borderTop: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))" }}>
                    <UnstyledButton
                        onClick={toggleGuide}
                        px="md" py="sm"
                        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                    >
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.5px" }}>Diet Guide &amp; Tips</Text>
                        <IconChevronDown size={14} style={{ transform: guideOpen ? "rotate(180deg)" : undefined, transition: "transform 150ms" }} />
                    </UnstyledButton>
                    <Collapse in={guideOpen}>
                        <Box px="md" pb="md">
                            <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md" mb={data.tips.length > 0 ? "sm" : 0}>
                                {data.recommended.length > 0 && (
                                    <Stack gap={6}>
                                        <Text size="xs" fw={700} c="green" tt="uppercase" style={{ letterSpacing: "0.5px" }}>Eat more of</Text>
                                        {data.recommended.map((r) => (
                                            <Box key={r.food}>
                                                <Text size="sm" fw={500}>{r.food}</Text>
                                                <Text size="xs" c="dimmed">{r.reason}</Text>
                                            </Box>
                                        ))}
                                    </Stack>
                                )}
                                {data.avoid.length > 0 && (
                                    <Stack gap={6}>
                                        <Text size="xs" fw={700} c="red" tt="uppercase" style={{ letterSpacing: "0.5px" }}>Limit or avoid</Text>
                                        {data.avoid.map((a) => (
                                            <Box key={a.food}>
                                                <Text size="sm" fw={500}>{a.food}</Text>
                                                <Text size="xs" c="dimmed">{a.reason}</Text>
                                            </Box>
                                        ))}
                                    </Stack>
                                )}
                            </SimpleGrid>
                            {data.tips.length > 0 && (
                                <>
                                    <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.5px" }} mb={4}>Practical tips</Text>
                                    <List size="sm" spacing={3}>
                                        {data.tips.map((t) => <List.Item key={t}>{t}</List.Item>)}
                                    </List>
                                </>
                            )}
                        </Box>
                    </Collapse>
                </Box>
            )}
        </Paper>
    );
}

// ── SOAP Note Card ────────────────────────────────────────────────────────────

export function SoapNoteCard({ data }: Readonly<{ data: SoapNoteInput }>) {
    const [open, { toggle }] = useDisclosure(false);
    const riskColor = RISK_COLOR[data.riskLevel];

    function handleCopy(e: React.MouseEvent) {
        e.stopPropagation();
        const text = [
            `Clinical Summary — ${data.condition}`,
            `Risk level: ${data.riskLevel}`,
            ``,
            `SUBJECTIVE`, data.subjective,
            ``,
            `OBJECTIVE`, data.objective,
            ``,
            `ASSESSMENT`, data.assessment,
            ``,
            `PLAN`,
            ...data.plan.map((p, i) => `${i + 1}. ${p}`),
        ].join("\n");
        void navigator.clipboard.writeText(text).then(() => {
            notifications.show({ message: "Clinical summary copied to clipboard", color: "violet", autoClose: 2500 });
        });
    }

    return (
        <Paper withBorder radius="lg" p={0} style={{ overflow: "hidden", borderLeft: `4px solid var(--mantine-color-${riskColor}-5)` }}>
            {/* ── Header — always visible, tap to expand ── */}
            <Box px="md" py="sm" onClick={toggle} style={{ cursor: "pointer" }}>
                <Group justify="space-between" wrap="nowrap" align="center">
                    <Group gap="xs" wrap="nowrap" align="center" style={{ flex: 1, minWidth: 0 }}>
                        <ThemeIcon size={28} radius="md" color="violet" variant="light" style={{ flexShrink: 0 }}><IconNotes size={15} /></ThemeIcon>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                            <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1, marginBottom: 1 }}>Clinical Note</Text>
                            <Text fw={700} size="sm">{data.condition}</Text>
                        </Box>
                    </Group>
                    <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
                        <Badge color={riskColor} size="sm" tt="capitalize" variant="light">{data.riskLevel} risk</Badge>
                        <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="gray"
                            title="Copy to clipboard"
                            onClick={handleCopy}
                        >
                            <IconCopy size={14} />
                        </ActionIcon>
                        <IconChevronDown
                            size={15}
                            color="var(--mantine-color-dimmed)"
                            style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms ease", flexShrink: 0 }}
                        />
                    </Group>
                </Group>
            </Box>

            {/* ── Body — collapsed by default ── */}
            <Collapse in={open}>
                <Divider />
                <Box px="md" py="sm">
                    <Stack gap="md">
                        {[
                            { label: "S — Subjective", value: data.subjective },
                            { label: "O — Objective", value: data.objective },
                            { label: "A — Assessment", value: data.assessment },
                        ].map(({ label, value }) => (
                            <Box key={label}>
                                <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.5px" }} mb={3}>{label}</Text>
                                <MarkdownContent text={value} />
                            </Box>
                        ))}
                        {data.plan.length > 0 && (
                            <Box>
                                <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.5px" }} mb={4}>P — Plan</Text>
                                <List size="sm" spacing={4}>
                                    {data.plan.map((p, i) => (
                                        <List.Item key={i}><Text component="span" size="sm">{parseInline(p, i * 100)}</Text></List.Item>
                                    ))}
                                </List>
                            </Box>
                        )}
                    </Stack>
                </Box>
            </Collapse>
        </Paper>
    );
}

// ── Dental Chart Card ─────────────────────────────────────────────────────────

const CONDITION_CFG: Record<DentalCondition, { fill: string; stroke: string; rootFill: string; label: string }> = {
    normal: { fill: "#dee2e6", stroke: "#adb5bd", rootFill: "#ced4da", label: "Normal" },
    caries: { fill: "#ff6b6b", stroke: "#e03131", rootFill: "#ffa8a8", label: "Decay" },
    cavity: { fill: "#f5c57a", stroke: "#c8820a", rootFill: "#ffe0b2", label: "Cavity" },
    restoration: { fill: "#dee2e6", stroke: "#adb5bd", rootFill: "#ced4da", label: "Restoration" },
    sinus: { fill: "#a5d8ff", stroke: "#1971c2", rootFill: "#d0ebff", label: "Sinus" },
    missing: { fill: "#495057", stroke: "#343a40", rootFill: "#868e96", label: "Missing" },
    crown: { fill: "#ffd43b", stroke: "#f08c00", rootFill: "#ffe499", label: "Crown" },
    root_canal: { fill: "#74c0fc", stroke: "#1971c2", rootFill: "#a5d8ff", label: "Root Canal" },
    impacted: { fill: "#cc5de8", stroke: "#7048e8", rootFill: "#da77f2", label: "Impacted" },
    periapical_lesion: { fill: "#f03e3e", stroke: "#c92a2a", rootFill: "#f08080", label: "Periapical" },
    watch: { fill: "#ff922b", stroke: "#d9480f", rootFill: "#ffc078", label: "Monitor" },
    unerupted: { fill: "#a9e34b", stroke: "#5c940d", rootFill: "#c0eb75", label: "Unerupted" },
    bridge: { fill: "#63e6be", stroke: "#0ca678", rootFill: "#96f2d7", label: "Bridge" },
};

const TOOTH_W_MAP: Record<number, number> = { 1: 28, 2: 26, 3: 28, 4: 30, 5: 32, 6: 44, 7: 40, 8: 38 };
const T_GAP = 3;
const ML_GAP = 10;
const MX = 20;
const UC_TOP = 24;
const CROWN_H = 36;
const ROOT_H = 30;
const UC_BOT = UC_TOP + CROWN_H;
const UR_TIP = UC_BOT + ROOT_H;
const MID_Y = 103;
const LR_TIP = MID_Y + (MID_Y - UR_TIP);
const LC_TOP = LR_TIP + ROOT_H;
const LC_BOT = LC_TOP + CROWN_H;
const UL_Y = 14;
const LL_Y = 196;
const CHART_H = 210;

/** px per mm of root length — ROOT_H (30px) represents ~15mm of root. */
const ROOT_MM = 15;

/** Hex fill colour for a bone-loss overlay keyed by severity in mm. */
function boneLossColor(mm: number): string {
    if (mm > 6) return "#f03e3e";
    if (mm > 4) return "#ff922b";
    if (mm > 2) return "#ffd43b";
    return "#51cf66";
}

/** Mantine color name for bone-loss Badge (avoids nested ternaries in JSX). */
function boneLossColorName(mm: number): string {
    if (mm > 6) return "red";
    if (mm > 4) return "orange";
    if (mm > 2) return "yellow";
    return "green";
}

/** Short label for furcation grade. */
function furcGrade(f?: "none" | "I" | "II" | "III"): string {
    if (f === "I") return "F1";
    if (f === "II") return "F2";
    if (f === "III") return "F3";
    return "";
}

// ── Temporal analysis ─────────────────────────────────────────────────────────

interface TemporalDelta { mm: number; label: string; colorName: string; }

/** Compute signed change between a current and prior measurement. */
function temporalDelta(current: number | undefined, prior: number | undefined): TemporalDelta | null {
    if (current == null || prior == null) return null;
    const mm = Math.round((current - prior) * 10) / 10;
    if (mm > 0) return { mm, label: `+${mm}mm ↑`, colorName: "red" };
    if (mm < 0) return { mm, label: `${mm}mm ↓`, colorName: "green" };
    return { mm: 0, label: "0mm =", colorName: "gray" };
}

// ── FDA 510(k)-convention mm ruler ────────────────────────────────────────────

/**
 * Renders a calibrated millimetre depth ruler in the left margin of the SVG,
 * following the radiographic measurement overlay conventions used by FDA
 * 510(k)-cleared dental imaging software (e.g. Planmeca Romexis, Carestream).
 */
function renderMmRuler(dimColor: string): React.ReactElement {
    const ticks = [2, 4, 6, 8, 10];
    const barX = MX - 2;
    const tickX = MX - 7;
    return (
        <g>
            {/* mm label */}
            <text x={tickX - 2} y={UC_BOT - 4} textAnchor="end" fontSize={5.5} fill={dimColor} fontFamily="system-ui" opacity={0.8}>mm</text>
            {/* Upper arch ruler */}
            <line x1={barX} y1={UC_BOT} x2={barX} y2={Math.min(UR_TIP - 2, UC_BOT + (10 / ROOT_MM) * ROOT_H)} stroke={dimColor} strokeWidth={0.6} opacity={0.6} />
            {ticks.map(mm => {
                const y = UC_BOT + (mm / ROOT_MM) * ROOT_H;
                if (y > UR_TIP - 1) return null;
                return (
                    <g key={`ur${mm}`}>
                        <line x1={tickX} y1={y} x2={barX} y2={y} stroke={dimColor} strokeWidth={0.6} opacity={0.6} />
                        <text x={tickX - 2} y={y + 2.5} textAnchor="end" fontSize={6} fill={dimColor} fontFamily="monospace" opacity={0.75}>{mm}</text>
                    </g>
                );
            })}
            {/* Lower arch ruler */}
            <line x1={barX} y1={LC_TOP} x2={barX} y2={Math.max(LR_TIP + 2, LC_TOP - (10 / ROOT_MM) * ROOT_H)} stroke={dimColor} strokeWidth={0.6} opacity={0.6} />
            {ticks.map(mm => {
                const y = LC_TOP - (mm / ROOT_MM) * ROOT_H;
                if (y < LR_TIP + 1) return null;
                return (
                    <g key={`lr${mm}`}>
                        <line x1={tickX} y1={y} x2={barX} y2={y} stroke={dimColor} strokeWidth={0.6} opacity={0.6} />
                        <text x={tickX - 2} y={y + 2.5} textAnchor="end" fontSize={6} fill={dimColor} fontFamily="monospace" opacity={0.75}>{mm}</text>
                    </g>
                );
            })}
        </g>
    );
}

interface ToothPos { fdi: number; x: number; w: number; }

function buildArchX(fdis: number[]): ToothPos[] {
    const result: ToothPos[] = [];
    let x = MX;
    fdis.forEach((fdi, idx) => {
        const w = TOOTH_W_MAP[fdi % 10] ?? 32;
        result.push({ fdi, x, w });
        x += w + T_GAP + (idx === fdis.length / 2 - 1 ? ML_GAP : 0);
    });
    return result;
}

const UPPER_FDIS = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_FDIS = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const ARCH_X_DATA = buildArchX(UPPER_FDIS);
const LOWER_X_DATA: ToothPos[] = ARCH_X_DATA.map((p, i) => ({ fdi: LOWER_FDIS[i]!, x: p.x, w: p.w }));
const CHART_W = ARCH_X_DATA[ARCH_X_DATA.length - 1]!.x + ARCH_X_DATA[ARCH_X_DATA.length - 1]!.w + MX;

function isMultiRootTooth(fdi: number): boolean { return (fdi % 10) >= 6; }

function renderUpperTooth(p: ToothPos, cfg: typeof CONDITION_CFG[DentalCondition], cond: DentalCondition, isHov: boolean, measurements?: DentalMeasurements): React.ReactElement {
    const { fdi, x, w } = p;
    const multi = isMultiRootTooth(fdi);
    const miss = cond === "missing";
    const sw = isHov ? 2.5 : 1;
    const dash = cond === "impacted" || cond === "unerupted" ? "5 2" : undefined;
    const baseForOverlay = cond === "restoration" || cond === "sinus";
    const baseCfg = baseForOverlay ? CONDITION_CFG["normal"] : cfg;
    // Bone loss from CEJ going downward into root zone
    const blMm = measurements?.boneLossFromCej ?? 0;
    const blPx = blMm > 0 ? Math.min((blMm / ROOT_MM) * ROOT_H, ROOT_H - 4) : 0;
    const blColor = boneLossColor(blMm);
    const boneY = UC_BOT + blPx;
    // Prior-visit bone level for temporal overlay
    const priorBlMm = measurements?.priorBoneLossFromCej ?? 0;
    const priorBlPx = priorBlMm > 0 ? Math.min((priorBlMm / ROOT_MM) * ROOT_H, ROOT_H - 4) : 0;
    const priorBoneY = UC_BOT + priorBlPx;
    const showFurcation = multi && (measurements?.furcation ?? "none") !== "none";
    const furcLabel = furcGrade(measurements?.furcation);
    return (
        <g key={fdi}>
            {miss ? (
                <>
                    <rect x={x} y={UC_TOP} width={w} height={CROWN_H} rx={4} fill={cfg.fill} stroke={cfg.stroke} strokeWidth={sw} strokeDasharray="4 2" />
                    <line x1={x + 4} y1={UC_TOP + 4} x2={x + w - 4} y2={UC_BOT - 4} stroke={cfg.stroke} strokeWidth={1.5} />
                    <line x1={x + w - 4} y1={UC_TOP + 4} x2={x + 4} y2={UC_BOT - 4} stroke={cfg.stroke} strokeWidth={1.5} />
                </>
            ) : (
                <>
                    {/* Roots */}
                    {multi ? (
                        <>
                            <polygon points={`${x + w * 0.13},${UC_BOT} ${x + w * 0.43},${UC_BOT} ${x + w * 0.28},${UR_TIP}`} fill={baseCfg.rootFill} stroke={baseCfg.stroke} strokeWidth={0.8} />
                            <polygon points={`${x + w * 0.57},${UC_BOT} ${x + w * 0.87},${UC_BOT} ${x + w * 0.72},${UR_TIP}`} fill={baseCfg.rootFill} stroke={baseCfg.stroke} strokeWidth={0.8} />
                        </>
                    ) : (
                        <polygon points={`${x + w * 0.25},${UC_BOT} ${x + w * 0.75},${UC_BOT} ${x + w * 0.5},${UR_TIP}`} fill={baseCfg.rootFill} stroke={baseCfg.stroke} strokeWidth={0.8} />
                    )}
                    {/* Crown body */}
                    <rect x={x} y={UC_TOP} width={w} height={CROWN_H} rx={4} fill={baseCfg.fill} stroke={baseCfg.stroke} strokeWidth={sw} strokeDasharray={dash} />

                    {/* Crown: cervical band + occlusal ridge for prosthetic crown */}
                    {cond === "crown" && (
                        <>
                            <rect x={x} y={UC_BOT - 7} width={w} height={7} rx={0} fill={cfg.stroke} opacity={0.35} />
                            <line x1={x + 3} y1={UC_TOP + 5} x2={x + w - 3} y2={UC_TOP + 5} stroke={cfg.stroke} strokeWidth={1} opacity={0.5} />
                        </>
                    )}

                    {/* Cavity: brown occlusal pit spot on crown */}
                    {cond === "cavity" && (
                        <>
                            <rect x={x} y={UC_TOP} width={w} height={CROWN_H} rx={4} fill={cfg.fill} stroke={cfg.stroke} strokeWidth={sw} />
                            <ellipse cx={x + w * 0.5} cy={UC_BOT - 8} rx={w * 0.28} ry={5} fill="#8b5e3c" opacity={0.75} />
                        </>
                    )}

                    {/* Restoration: amalgam/composite inset block */}
                    {cond === "restoration" && (
                        <rect
                            x={x + w * 0.22} y={UC_TOP + 7}
                            width={w * 0.56} height={CROWN_H - 14}
                            rx={2}
                            fill="#868e96" stroke="#495057" strokeWidth={0.8} opacity={0.85}
                        />
                    )}

                    {/* Sinus: translucent dome above root tip (maxillary sinus proximity) */}
                    {cond === "sinus" && (
                        <ellipse
                            cx={x + w * 0.5} cy={UR_TIP - 2}
                            rx={w * 0.48} ry={9}
                            fill="rgba(116,192,252,0.28)" stroke="#74c0fc" strokeWidth={1} strokeDasharray="3 2"
                        />
                    )}

                    {/* Periapical lesion: red halo at root apex */}
                    {cond === "periapical_lesion" && (
                        <ellipse cx={x + w * 0.5} cy={UR_TIP} rx={7} ry={5} fill="rgba(240,62,62,0.3)" stroke="#c92a2a" strokeWidth={1} />
                    )}

                    {/* Bone loss from CEJ — semi-transparent shaded zone + solid bone level line + mm label */}
                    {blMm > 0 && (
                        <>
                            <rect x={x + 1} y={UC_BOT} width={w - 2} height={blPx} fill={blColor} opacity={0.25} />
                            <line x1={x} y1={boneY} x2={x + w} y2={boneY} stroke={blColor} strokeWidth={1.5} strokeDasharray="3 2" />
                            <text x={x + w * 0.5} y={boneY + 6} textAnchor="middle" fontSize={6.5} fill={blColor} fontWeight="700" fontFamily="monospace">{blMm}mm</text>
                        </>
                    )}

                    {/* Temporal: prior bone level — thin dashed cyan line */}
                    {priorBlMm > 0 && (
                        <line x1={x} y1={priorBoneY} x2={x + w} y2={priorBoneY} stroke="#74c0fc" strokeWidth={0.8} strokeDasharray="2 2" opacity={0.7} />
                    )}

                    {/* Furcation indicator in the inter-radicular space */}
                    {showFurcation && (
                        <text x={x + w * 0.5} y={UC_BOT + 11} textAnchor="middle" fontSize={7} fill="#7048e8" fontWeight="700" fontFamily="system-ui">{furcLabel}</text>
                    )}
                </>
            )}
            {/* Transparent enlarged touch target */}
            <rect x={x - 2} y={UC_TOP - 14} width={w + 4} height={CROWN_H + ROOT_H + 14} fill="transparent" />
        </g>
    );
}

function renderLowerTooth(p: ToothPos, cfg: typeof CONDITION_CFG[DentalCondition], cond: DentalCondition, isHov: boolean, measurements?: DentalMeasurements): React.ReactElement {
    const { fdi, x, w } = p;
    const multi = isMultiRootTooth(fdi);
    const miss = cond === "missing";
    const sw = isHov ? 2.5 : 1;
    const dash = cond === "impacted" || cond === "unerupted" ? "5 2" : undefined;
    const baseForOverlay = cond === "restoration" || cond === "sinus";
    const baseCfg = baseForOverlay ? CONDITION_CFG["normal"] : cfg;
    // Bone loss from CEJ going upward into root zone (roots are above crown for lower teeth)
    const blMm = measurements?.boneLossFromCej ?? 0;
    const blPx = blMm > 0 ? Math.min((blMm / ROOT_MM) * ROOT_H, ROOT_H - 4) : 0;
    const blColor = boneLossColor(blMm);
    const boneY = LC_TOP - blPx;
    // Prior-visit bone level for temporal overlay
    const priorBlMm = measurements?.priorBoneLossFromCej ?? 0;
    const priorBlPx = priorBlMm > 0 ? Math.min((priorBlMm / ROOT_MM) * ROOT_H, ROOT_H - 4) : 0;
    const priorBoneY = LC_TOP - priorBlPx;
    const showFurcation = multi && (measurements?.furcation ?? "none") !== "none";
    const furcLabel = furcGrade(measurements?.furcation);
    return (
        <g key={fdi}>
            {miss ? (
                <>
                    <rect x={x} y={LC_TOP} width={w} height={CROWN_H} rx={4} fill={cfg.fill} stroke={cfg.stroke} strokeWidth={sw} strokeDasharray="4 2" />
                    <line x1={x + 4} y1={LC_TOP + 4} x2={x + w - 4} y2={LC_BOT - 4} stroke={cfg.stroke} strokeWidth={1.5} />
                    <line x1={x + w - 4} y1={LC_TOP + 4} x2={x + 4} y2={LC_BOT - 4} stroke={cfg.stroke} strokeWidth={1.5} />
                </>
            ) : (
                <>
                    {/* Roots */}
                    {multi ? (
                        <>
                            <polygon points={`${x + w * 0.13},${LC_TOP} ${x + w * 0.43},${LC_TOP} ${x + w * 0.28},${LR_TIP}`} fill={baseCfg.rootFill} stroke={baseCfg.stroke} strokeWidth={0.8} />
                            <polygon points={`${x + w * 0.57},${LC_TOP} ${x + w * 0.87},${LC_TOP} ${x + w * 0.72},${LR_TIP}`} fill={baseCfg.rootFill} stroke={baseCfg.stroke} strokeWidth={0.8} />
                        </>
                    ) : (
                        <polygon points={`${x + w * 0.25},${LC_TOP} ${x + w * 0.75},${LC_TOP} ${x + w * 0.5},${LR_TIP}`} fill={baseCfg.rootFill} stroke={baseCfg.stroke} strokeWidth={0.8} />
                    )}
                    {/* Crown body */}
                    <rect x={x} y={LC_TOP} width={w} height={CROWN_H} rx={4} fill={baseCfg.fill} stroke={baseCfg.stroke} strokeWidth={sw} strokeDasharray={dash} />

                    {/* Crown: cervical band + occlusal ridge */}
                    {cond === "crown" && (
                        <>
                            <rect x={x} y={LC_TOP} width={w} height={7} rx={0} fill={cfg.stroke} opacity={0.35} />
                            <line x1={x + 3} y1={LC_BOT - 5} x2={x + w - 3} y2={LC_BOT - 5} stroke={cfg.stroke} strokeWidth={1} opacity={0.5} />
                        </>
                    )}

                    {/* Cavity: brown occlusal pit on crown */}
                    {cond === "cavity" && (
                        <>
                            <rect x={x} y={LC_TOP} width={w} height={CROWN_H} rx={4} fill={cfg.fill} stroke={cfg.stroke} strokeWidth={sw} />
                            <ellipse cx={x + w * 0.5} cy={LC_TOP + 8} rx={w * 0.28} ry={5} fill="#8b5e3c" opacity={0.75} />
                        </>
                    )}

                    {/* Restoration: amalgam/composite inset block */}
                    {cond === "restoration" && (
                        <rect
                            x={x + w * 0.22} y={LC_TOP + 7}
                            width={w * 0.56} height={CROWN_H - 14}
                            rx={2}
                            fill="#868e96" stroke="#495057" strokeWidth={0.8} opacity={0.85}
                        />
                    )}

                    {/* Sinus: not clinically applicable to mandibular teeth — render as watch marker */}
                    {cond === "sinus" && (
                        <ellipse
                            cx={x + w * 0.5} cy={LR_TIP + 2}
                            rx={w * 0.48} ry={8}
                            fill="rgba(116,192,252,0.28)" stroke="#74c0fc" strokeWidth={1} strokeDasharray="3 2"
                        />
                    )}

                    {/* Periapical lesion: red halo at root apex */}
                    {cond === "periapical_lesion" && (
                        <ellipse cx={x + w * 0.5} cy={LR_TIP} rx={7} ry={5} fill="rgba(240,62,62,0.3)" stroke="#c92a2a" strokeWidth={1} />
                    )}

                    {/* Bone loss from CEJ — shaded zone + bone level line (upward direction) + mm label */}
                    {blMm > 0 && (
                        <>
                            <rect x={x + 1} y={boneY} width={w - 2} height={blPx} fill={blColor} opacity={0.25} />
                            <line x1={x} y1={boneY} x2={x + w} y2={boneY} stroke={blColor} strokeWidth={1.5} strokeDasharray="3 2" />
                            <text x={x + w * 0.5} y={boneY - 2} textAnchor="middle" fontSize={6.5} fill={blColor} fontWeight="700" fontFamily="monospace">{blMm}mm</text>
                        </>
                    )}

                    {/* Temporal: prior bone level — thin dashed cyan line */}
                    {priorBlMm > 0 && (
                        <line x1={x} y1={priorBoneY} x2={x + w} y2={priorBoneY} stroke="#74c0fc" strokeWidth={0.8} strokeDasharray="2 2" opacity={0.7} />
                    )}

                    {/* Furcation indicator */}
                    {showFurcation && (
                        <text x={x + w * 0.5} y={LC_TOP - 3} textAnchor="middle" fontSize={7} fill="#7048e8" fontWeight="700" fontFamily="system-ui">{furcLabel}</text>
                    )}
                </>
            )}
            {/* Transparent enlarged touch target */}
            <rect x={x - 2} y={LC_TOP} width={w + 4} height={CROWN_H + ROOT_H + 14} fill="transparent" />
        </g>
    );
}

export function DentalChartCard({ data }: Readonly<{ data: DentalChartInput }>) {
    const [hoveredFdi, setHoveredFdi] = useState<number | null>(null);
    const { colorScheme } = useMantineColorScheme();
    const isDark = colorScheme === "dark";
    const chartBg = isDark ? "#1a1b1e" : "#f1f3f5";
    const lineColor = isDark ? "#373a40" : "#ced4da";
    const labelColor = isDark ? "#ced4da" : "#495057";
    const dimColor = isDark ? "#5c5f66" : "#adb5bd";

    const findingMap = new Map(data.findings.map((f: DentalFinding) => [f.tooth, f]));
    const hovFinding = hoveredFdi !== null ? findingMap.get(hoveredFdi) : undefined;
    const hovCond: DentalCondition = hovFinding?.condition ?? "normal";
    const abnormal = data.findings.filter((f: DentalFinding) => f.condition !== "normal");

    return (
        <Paper withBorder radius="lg" p="md" style={{ borderLeft: "4px solid var(--mantine-color-cyan-5)" }}>
            <Stack gap="sm">
                <Group justify="space-between" wrap="wrap" gap="xs">
                    <Group gap="xs">
                        <ThemeIcon size={28} radius="md" color="cyan" variant="light"><IconDental size={15} /></ThemeIcon>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                            <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1, marginBottom: 1 }}>Dental Chart</Text>
                            <Text fw={700} size="sm">{data.summary}</Text>
                            {(data.visitDate ?? data.priorVisitDate) && (
                                <Group gap={5} wrap="nowrap" mt={2}>
                                    {data.visitDate && <Text size="xs" c="dimmed">{new Date(data.visitDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</Text>}
                                    {data.priorVisitDate && (
                                        <>
                                            <Text size="xs" c="dimmed">vs.</Text>
                                            <Text size="xs" c="dimmed">{new Date(data.priorVisitDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</Text>
                                            <Badge size="xs" color="blue" variant="dot">Temporal</Badge>
                                        </>
                                    )}
                                </Group>
                            )}
                        </Box>
                    </Group>
                    {abnormal.length > 0 && <Badge color="orange" size="sm">{abnormal.length} finding{abnormal.length > 1 ? "s" : ""}</Badge>}
                </Group>

                {/* Periodontal staging — shown immediately below header */}
                {data.periodontalSummary && (
                    <Paper radius="md" p="xs" style={{ background: "light-dark(var(--mantine-color-red-0), rgba(250,82,82,0.08))", border: "1px solid var(--mantine-color-red-3)" }}>
                        <Group gap={6} wrap="nowrap" align="flex-start">
                            <IconDental size={13} color="var(--mantine-color-red-6)" style={{ marginTop: 1, flexShrink: 0 }} />
                            <Text size="xs"><span style={{ fontWeight: 700 }}>Periodontal: </span>{data.periodontalSummary}</Text>
                        </Group>
                    </Paper>
                )}

                {/* SVG chart — responsive via viewBox, scrollable fallback below 320px */}
                <Box
                    style={{
                        overflowX: "auto",
                        WebkitOverflowScrolling: "touch",
                        borderRadius: 8,
                        background: chartBg,
                        padding: "8px 0 4px",
                    }}
                >
                    <svg
                        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                        style={{ display: "block", width: "100%", height: "auto", minWidth: 320 }}
                    >
                        <line x1={CHART_W / 2} y1={UC_TOP - 4} x2={CHART_W / 2} y2={LC_BOT + 4} stroke={lineColor} strokeWidth={1} strokeDasharray="4 3" />
                        <line x1={MX} y1={MID_Y} x2={CHART_W - MX} y2={MID_Y} stroke={lineColor} strokeWidth={0.5} />
                        <text x={MX - 6} y={MID_Y - 5} textAnchor="end" fontSize={8} fill={dimColor} fontFamily="system-ui">U</text>
                        <text x={MX - 6} y={MID_Y + 12} textAnchor="end" fontSize={8} fill={dimColor} fontFamily="system-ui">L</text>

                        {/* ── FDA 510(k)-convention reference overlays ── */}
                        {/* CEJ reference lines — blue dashed horizontal */}
                        <line x1={MX} y1={UC_BOT} x2={CHART_W - MX} y2={UC_BOT} stroke="#1971c2" strokeWidth={0.8} strokeDasharray="3 2" opacity={0.4} />
                        <line x1={MX} y1={LC_TOP} x2={CHART_W - MX} y2={LC_TOP} stroke="#1971c2" strokeWidth={0.8} strokeDasharray="3 2" opacity={0.4} />
                        {/* Healthy alveolar bone baseline (≤1.5 mm from CEJ = normal) */}
                        <line x1={MX} y1={UC_BOT + 3} x2={CHART_W - MX} y2={UC_BOT + 3} stroke="#51cf66" strokeWidth={0.6} strokeDasharray="5 4" opacity={0.3} />
                        <line x1={MX} y1={LC_TOP - 3} x2={CHART_W - MX} y2={LC_TOP - 3} stroke="#51cf66" strokeWidth={0.6} strokeDasharray="5 4" opacity={0.3} />
                        {/* Calibrated mm depth ruler */}
                        {renderMmRuler(dimColor)}

                        {ARCH_X_DATA.map(p => {
                            const finding = findingMap.get(p.fdi);
                            const cond: DentalCondition = finding?.condition ?? "normal";
                            const cfg = CONDITION_CFG[cond];
                            const isHov = hoveredFdi === p.fdi;
                            return (
                                <g key={p.fdi} style={{ cursor: "pointer" }} onMouseEnter={() => setHoveredFdi(p.fdi)} onMouseLeave={() => setHoveredFdi(null)} onClick={() => setHoveredFdi(p.fdi === hoveredFdi ? null : p.fdi)}>
                                    {renderUpperTooth(p, cfg, cond, isHov, finding?.measurements)}
                                    <text x={p.x + p.w / 2} y={UL_Y} textAnchor="middle" fontSize={9} fill={isHov ? "#1971c2" : labelColor} fontWeight={isHov ? "700" : "400"} fontFamily="system-ui">{p.fdi}</text>
                                </g>
                            );
                        })}
                        {LOWER_X_DATA.map(p => {
                            const finding = findingMap.get(p.fdi);
                            const cond: DentalCondition = finding?.condition ?? "normal";
                            const cfg = CONDITION_CFG[cond];
                            const isHov = hoveredFdi === p.fdi;
                            return (
                                <g key={p.fdi} style={{ cursor: "pointer" }} onMouseEnter={() => setHoveredFdi(p.fdi)} onMouseLeave={() => setHoveredFdi(null)} onClick={() => setHoveredFdi(p.fdi === hoveredFdi ? null : p.fdi)}>
                                    {renderLowerTooth(p, cfg, cond, isHov, finding?.measurements)}
                                    <text x={p.x + p.w / 2} y={LL_Y} textAnchor="middle" fontSize={9} fill={isHov ? "#1971c2" : labelColor} fontWeight={isHov ? "700" : "400"} fontFamily="system-ui">{p.fdi}</text>
                                </g>
                            );
                        })}
                    </svg>
                </Box>

                {/* ── Calibrated Measurements Strip ── */}
                {(() => {
                    type MetricKey = keyof Pick<DentalMeasurements, "boneLossFromCej" | "probingDepth" | "clinicalAttachmentLevel" | "recession" | "mobility">;
                    const metrics: { key: MetricKey; label: string; unit: string; colorFn: (v: number) => string }[] = [
                        { key: "boneLossFromCej", label: "BL (mm)", unit: "mm", colorFn: boneLossColorName },
                        { key: "probingDepth", label: "PD (mm)", unit: "mm", colorFn: (v) => v >= 6 ? "red" : v >= 4 ? "orange" : "teal" },
                        { key: "clinicalAttachmentLevel", label: "CAL (mm)", unit: "mm", colorFn: (v) => v >= 5 ? "red" : v >= 3 ? "orange" : "green" },
                        { key: "recession", label: "Rec (mm)", unit: "mm", colorFn: (v) => v >= 3 ? "orange" : "gray" },
                        { key: "mobility", label: "Mob", unit: "", colorFn: (v) => v >= 3 ? "red" : v >= 2 ? "orange" : "yellow" },
                    ];
                    const measuredFindings = data.findings.filter(f =>
                        f.measurements && metrics.some(m => f.measurements![m.key] != null)
                    ).sort((a, b) => a.tooth - b.tooth);
                    if (measuredFindings.length === 0) return null;
                    const activeMetrics = metrics.filter(m => measuredFindings.some(f => f.measurements![m.key] != null));
                    return (
                        <Box>
                            <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.5px", marginBottom: 4 }}>Calibrated Measurements</Text>
                            <Box style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: measuredFindings.length * 44 + 64 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: "left", padding: "2px 8px 4px 0", fontSize: 10, color: dimColor, fontWeight: 700, whiteSpace: "nowrap", borderBottom: `1px solid ${lineColor}` }}>Tooth</th>
                                            {measuredFindings.map(f => (
                                                <th key={f.tooth} style={{ textAlign: "center", padding: "2px 3px 4px", fontSize: 10, fontWeight: 700, color: labelColor, whiteSpace: "nowrap", borderBottom: `1px solid ${lineColor}` }}>{f.tooth}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeMetrics.map((m, ri) => (
                                            <tr key={m.key} style={{ background: ri % 2 === 0 ? "transparent" : "light-dark(rgba(0,0,0,0.03),rgba(255,255,255,0.03))" }}>
                                                <td style={{ padding: "3px 8px 3px 0", fontSize: 10, fontWeight: 700, color: dimColor, whiteSpace: "nowrap" }}>{m.label}</td>
                                                {measuredFindings.map(f => {
                                                    const raw = f.measurements![m.key];
                                                    const val = raw as number | undefined;
                                                    return (
                                                        <td key={f.tooth} style={{ textAlign: "center", padding: "3px 3px" }}>
                                                            {val != null ? (
                                                                <Badge size="xs" color={m.colorFn(val)} variant="light" style={{ minWidth: 30, fontSize: 9, fontFamily: "monospace" }}>
                                                                    {val}{m.unit}
                                                                </Badge>
                                                            ) : (
                                                                <Text size="xs" c="dimmed" ta="center">—</Text>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </Box>
                        </Box>
                    );
                })()}

                {/* Tooth detail panel — always occupies space to prevent layout jump */}
                <Paper radius="md" px="sm" py={6} withBorder style={{ minHeight: 40 }}>
                    {hoveredFdi !== null ? (
                        <Group gap={8} wrap="wrap">
                            <Box style={{ width: 11, height: 11, borderRadius: 3, flexShrink: 0, alignSelf: "center", background: CONDITION_CFG[hovCond].fill, border: `1px solid ${CONDITION_CFG[hovCond].stroke}` }} />
                            <Text size="xs" fw={700}>Tooth {hoveredFdi}</Text>
                            <Badge size="xs" color={hovCond === "caries" || hovCond === "periapical_lesion" ? "red" : hovCond === "normal" ? "gray" : "cyan"} variant="light">{CONDITION_CFG[hovCond].label}</Badge>
                            {hovFinding?.severity && <Badge size="xs" color={hovFinding.severity === "severe" ? "red" : hovFinding.severity === "moderate" ? "orange" : "yellow"} variant="light">{hovFinding.severity}</Badge>}
                            {hovFinding?.surfaces && hovFinding.surfaces.length > 0 && (
                                <Group gap={4} wrap="nowrap" style={{ width: "100%" }}>
                                    <Text size="xs" c="dimmed" fw={500}>Surfaces:</Text>
                                    {hovFinding.surfaces.map(s => <Badge key={s} size="xs" color="cyan" variant="dot">{s}</Badge>)}
                                </Group>
                            )}
                            {(() => {
                                const m = hovFinding?.measurements;
                                if (!m) return null;
                                const blD = temporalDelta(m.boneLossFromCej, m.priorBoneLossFromCej);
                                const pdD = temporalDelta(m.probingDepth, m.priorProbingDepth);
                                const calD = temporalDelta(m.clinicalAttachmentLevel, m.priorClinicalAttachmentLevel);
                                if (!blD && !pdD && !calD) return null;
                                return (
                                    <Box style={{ width: "100%", marginTop: 2 }}>
                                        <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.4px", marginBottom: 3 }}>Change vs. prior visit</Text>
                                        <Group gap={5} wrap="wrap">
                                            {blD && <Badge size="xs" color={blD.colorName} variant="filled">BL {blD.label}</Badge>}
                                            {pdD && <Badge size="xs" color={pdD.colorName} variant="light">PD {pdD.label}</Badge>}
                                            {calD && <Badge size="xs" color={calD.colorName} variant="light">CAL {calD.label}</Badge>}
                                        </Group>
                                    </Box>
                                );
                            })()}
                            {hovFinding?.measurements && (
                                <Box style={{ width: "100%", marginTop: 2 }}>
                                    <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.4px", marginBottom: 3 }}>Measurements</Text>
                                    <Group gap={5} wrap="wrap">
                                        {hovFinding.measurements.boneLossFromCej != null && (
                                            <Badge size="xs" color={boneLossColorName(hovFinding.measurements.boneLossFromCej)} variant="filled">
                                                BL {hovFinding.measurements.boneLossFromCej}mm
                                            </Badge>
                                        )}
                                        {hovFinding.measurements.probingDepth != null && (
                                            <Badge size="xs" color="cyan" variant="light">PD {hovFinding.measurements.probingDepth}mm</Badge>
                                        )}
                                        {hovFinding.measurements.clinicalAttachmentLevel != null && (
                                            <Badge size="xs" color="violet" variant="light">CAL {hovFinding.measurements.clinicalAttachmentLevel}mm</Badge>
                                        )}
                                        {hovFinding.measurements.recession != null && (
                                            <Badge size="xs" color="grape" variant="light">Rec {hovFinding.measurements.recession}mm</Badge>
                                        )}
                                        {hovFinding.measurements.furcation && hovFinding.measurements.furcation !== "none" && (
                                            <Badge size="xs" color="indigo" variant="light">Furc {hovFinding.measurements.furcation}</Badge>
                                        )}
                                        {hovFinding.measurements.mobility != null && hovFinding.measurements.mobility > 0 && (
                                            <Badge size="xs" color="orange" variant="light">Mob {hovFinding.measurements.mobility}</Badge>
                                        )}
                                    </Group>
                                </Box>
                            )}
                            {hovFinding?.note
                                ? <Text size="xs" c="dimmed" style={{ width: "100%" }}>{hovFinding.note}</Text>
                                : <Text size="xs" c="dimmed">No specific finding</Text>}
                        </Group>
                    ) : (
                        <Text size="xs" c="dimmed" ta="center" style={{ lineHeight: "28px" }}>Tap or hover a tooth to see details</Text>
                    )}
                </Paper>

                {abnormal.length > 0 && (
                    <Stack gap={6}>
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.5px" }}>Annotated findings</Text>
                        {abnormal.map((f: DentalFinding, i: number) => (
                            <Paper key={i} withBorder radius="sm" px="sm" py={6}>
                                <Group gap={8} wrap="wrap">
                                    <Group gap={6} wrap="nowrap">
                                        <Box style={{ width: 10, height: 10, borderRadius: 3, flexShrink: 0, background: CONDITION_CFG[f.condition].fill, border: `1px solid ${CONDITION_CFG[f.condition].stroke}` }} />
                                        <Text size="xs" fw={700} ff="monospace" c="dimmed">#{f.tooth}</Text>
                                        <Badge size="xs" color="gray" variant="light">{CONDITION_CFG[f.condition].label}</Badge>
                                        {f.severity && <Badge size="xs" color={f.severity === "severe" ? "red" : f.severity === "moderate" ? "orange" : "yellow"} variant="light">{f.severity}</Badge>}
                                    </Group>
                                    {f.surfaces && f.surfaces.length > 0 && (
                                        <Group gap={4} wrap="nowrap" style={{ flex: "1 1 100%" }}>
                                            <Text size="xs" c="dimmed" fw={500}>Surfaces:</Text>
                                            {f.surfaces.map(s => <Badge key={s} size="xs" color="cyan" variant="dot">{s}</Badge>)}
                                        </Group>
                                    )}
                                    {(() => {
                                        const m = f.measurements;
                                        if (!m) return null;
                                        const blD = temporalDelta(m.boneLossFromCej, m.priorBoneLossFromCej);
                                        const pdD = temporalDelta(m.probingDepth, m.priorProbingDepth);
                                        const calD = temporalDelta(m.clinicalAttachmentLevel, m.priorClinicalAttachmentLevel);
                                        if (!blD && !pdD && !calD) return null;
                                        return (
                                            <Group gap={5} wrap="wrap" style={{ flex: "1 1 100%" }}>
                                                {blD && <Badge size="xs" color={blD.colorName} variant="filled">Δ BL {blD.label}</Badge>}
                                                {pdD && <Badge size="xs" color={pdD.colorName} variant="light">Δ PD {pdD.label}</Badge>}
                                                {calD && <Badge size="xs" color={calD.colorName} variant="light">Δ CAL {calD.label}</Badge>}
                                            </Group>
                                        );
                                    })()}
                                    {f.measurements && (
                                        <Group gap={5} wrap="wrap" style={{ flex: "1 1 100%" }}>
                                            {f.measurements.boneLossFromCej != null && (
                                                <Badge size="xs" color={boneLossColorName(f.measurements.boneLossFromCej)} variant="filled">BL {f.measurements.boneLossFromCej}mm</Badge>
                                            )}
                                            {f.measurements.probingDepth != null && (
                                                <Badge size="xs" color="cyan" variant="light">PD {f.measurements.probingDepth}mm</Badge>
                                            )}
                                            {f.measurements.clinicalAttachmentLevel != null && (
                                                <Badge size="xs" color="violet" variant="light">CAL {f.measurements.clinicalAttachmentLevel}mm</Badge>
                                            )}
                                            {f.measurements.recession != null && (
                                                <Badge size="xs" color="grape" variant="light">Rec {f.measurements.recession}mm</Badge>
                                            )}
                                            {f.measurements.furcation && f.measurements.furcation !== "none" && (
                                                <Badge size="xs" color="indigo" variant="light">Furc {f.measurements.furcation}</Badge>
                                            )}
                                            {f.measurements.mobility != null && f.measurements.mobility > 0 && (
                                                <Badge size="xs" color="orange" variant="light">Mob {f.measurements.mobility}</Badge>
                                            )}
                                        </Group>
                                    )}
                                    {f.note && <Text size="xs" c="dimmed" style={{ flex: "1 1 100%" }}>{f.note}</Text>}
                                </Group>
                            </Paper>
                        ))}
                    </Stack>
                )}

                {data.orthodonticFindings && (
                    <Paper radius="md" p="xs" style={{ background: "light-dark(var(--mantine-color-cyan-0), rgba(116,192,252,0.08))", border: "1px solid var(--mantine-color-cyan-3)" }}>
                        <Group gap={6} wrap="nowrap" align="flex-start">
                            <IconDentalBroken size={13} color="var(--mantine-color-cyan-6)" style={{ marginTop: 1, flexShrink: 0 }} />
                            <Text size="xs"><span style={{ fontWeight: 700 }}>Orthodontic: </span>{data.orthodonticFindings}</Text>
                        </Group>
                    </Paper>
                )}

                <Group gap={6} wrap="wrap">
                    {(Object.entries(CONDITION_CFG) as [DentalCondition, (typeof CONDITION_CFG)[DentalCondition]][]).map(([cond, cfg]) => (
                        <Group key={cond} gap={4} wrap="nowrap">
                            <Box style={{ width: 10, height: 10, borderRadius: 2, flexShrink: 0, background: cfg.fill, border: `1px solid ${cfg.stroke}` }} />
                            <Text size="xs" c="dimmed">{cfg.label}</Text>
                        </Group>
                    ))}
                    {/* Temporal overlay legend */}
                    <Group gap={4} wrap="nowrap">
                        <Box style={{ width: 18, height: 2, flexShrink: 0, background: "#74c0fc", borderRadius: 1, border: "none" }} />
                        <Text size="xs" c="dimmed">Prior BL</Text>
                    </Group>
                </Group>

                {/* FDA 510(k)-convention overlay disclaimer */}
                <Group gap={5} wrap="nowrap" pt={4} style={{ borderTop: "1px solid var(--mantine-color-default-border)" }}>
                    <IconShieldCheck size={11} color="var(--mantine-color-dimmed)" style={{ flexShrink: 0, marginTop: 1 }} />
                    <Text style={{ fontSize: 10, lineHeight: 1.4 }} c="dimmed">
                        Reference overlays follow FDA 510(k) radiographic measurement conventions — CEJ line · bone crest baseline · mm ruler · temporal delta. For clinical reference only; not a substitute for professional diagnosis.
                    </Text>
                </Group>
            </Stack>
        </Paper>
    );
}

// ── Suggest Actions Card ──────────────────────────────────────────────────────

export function SuggestActionsCard({
    data,
    toolCallId,
    isAnswered,
    onAnswer,
}: Readonly<{
    data: SuggestActionsInput;
    toolCallId: string;
    isAnswered: boolean;
    onAnswer: (toolCallId: string, answer: string) => void;
}>) {
    return (
        <Paper withBorder radius="lg" p="md" style={{ borderLeft: "4px solid var(--mantine-color-primary-5)" }}>
            <Stack gap="sm">
                <Group gap="xs">
                    <ThemeIcon size={28} radius="md" color="primary" variant="light">
                        <IconChecklist size={15} />
                    </ThemeIcon>
                    <Box>
                        <Text fw={700} size="sm">{data.condition}</Text>
                        <Text size="xs" c="dimmed">What would you like to do next?</Text>
                    </Box>
                </Group>
                <Group gap={8} wrap="wrap" pl={36}>
                    {data.actions.map((a: SuggestActionItem) => (
                        <Button
                            key={a.label}
                            size="sm"
                            variant={isAnswered ? "outline" : "light"}
                            color="primary"
                            disabled={isAnswered}
                            onClick={() => onAnswer(toolCallId, a.message)}
                            style={{ flexShrink: 0 }}
                        >
                            {a.label}
                        </Button>
                    ))}
                </Group>
                {isAnswered && (
                    <Text size="xs" c="dimmed" pl={36} fs="italic">Option selected — generating your content…</Text>
                )}
            </Stack>
        </Paper>
    );
}

// ── Log Vitals Card ───────────────────────────────────────────────────────────

export function LogVitalsCard({ data }: Readonly<{ data: LogVitalsInput }>) {
    const [opened, { toggle }] = useDisclosure(false);

    // Build flat array of recorded readings for summary + grid
    const readings: Array<{ icon: ReactNode; label: string; value: string }> = [];
    if (data.systolicBp != null && data.diastolicBp != null)
        readings.push({ icon: <IconHeartbeat size={13} />, label: "Blood Pressure", value: `${data.systolicBp}/${data.diastolicBp} mmHg` });
    if (data.restingHr != null)
        readings.push({ icon: <IconHeartbeat size={13} />, label: "Heart Rate", value: `${data.restingHr} bpm` });
    if (data.spo2 != null)
        readings.push({ icon: <IconLungs size={13} />, label: "SpO₂", value: `${data.spo2}%` });
    if (data.temperatureC != null)
        readings.push({ icon: <IconFlame size={13} />, label: "Temperature", value: `${data.temperatureC}°C` });
    if (data.respiratoryRate != null)
        readings.push({ icon: <IconLungs size={13} />, label: "Resp. Rate", value: `${data.respiratoryRate} br/min` });
    if (data.glucoseMmol != null)
        readings.push({ icon: <IconDroplet size={13} />, label: "Blood Glucose", value: `${data.glucoseMmol} mmol/L` });
    if (data.waistCm != null)
        readings.push({ icon: <IconFlask size={13} />, label: "Waist", value: `${data.waistCm} cm` });
    if (data.hipCm != null)
        readings.push({ icon: <IconFlask size={13} />, label: "Hip", value: `${data.hipCm} cm` });
    if (data.neckCm != null)
        readings.push({ icon: <IconFlask size={13} />, label: "Neck", value: `${data.neckCm} cm` });

    const summaryLabels = readings.slice(0, 3).map(r => r.label).join(" · ");

    return (
        <Paper withBorder radius="lg" p={0} style={{ overflow: "hidden", borderLeft: "4px solid var(--mantine-color-teal-5)" }}>
            <UnstyledButton onClick={toggle} style={{ width: "100%", display: "block" }} aria-expanded={opened}>
                <Box px="md" py="sm" style={{ background: "light-dark(var(--mantine-color-teal-0), rgba(0,0,0,0.2))" }}>
                    <Group gap="sm" wrap="nowrap" align="center">
                        <ThemeIcon size={32} radius="md" color="teal" variant="filled" style={{ flexShrink: 0 }}>
                            <IconHeartbeat size={16} />
                        </ThemeIcon>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                            <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1, marginBottom: 1 }}>Vitals Recorded</Text>
                            <Text size="sm" fw={600} c="teal.7" truncate>{summaryLabels || "Measurements saved"}</Text>
                        </Box>
                        <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                            {readings.length > 0 && (
                                <Badge size="xs" color="teal" variant="light">{readings.length} reading{readings.length !== 1 ? "s" : ""}</Badge>
                            )}
                            <ThemeIcon size={20} radius="xl" color="gray" variant="subtle"
                                style={{ transition: "transform 200ms ease", transform: opened ? "rotate(180deg)" : "rotate(0deg)" }}>
                                <IconChevronDown size={13} />
                            </ThemeIcon>
                        </Group>
                    </Group>
                </Box>
            </UnstyledButton>
            <Collapse in={opened}>
                <Box px="md" py="sm">
                    <Stack gap="xs">
                        <SimpleGrid cols={2} spacing="xs">
                            {readings.map((r) => (
                                <Paper key={r.label} withBorder radius="md" px="sm" py={6}
                                    style={{ background: "light-dark(var(--mantine-color-teal-0), rgba(0,0,0,0.15))" }}>
                                    <Group gap={6} wrap="nowrap">
                                        <ThemeIcon size={20} radius="sm" color="teal" variant="light" style={{ flexShrink: 0 }}>
                                            {r.icon}
                                        </ThemeIcon>
                                        <Box style={{ minWidth: 0 }}>
                                            <Text size="xs" c="dimmed" style={{ lineHeight: 1 }}>{r.label}</Text>
                                            <Text size="sm" fw={600} style={{ lineHeight: 1.3 }}>{r.value}</Text>
                                        </Box>
                                    </Group>
                                </Paper>
                            ))}
                        </SimpleGrid>
                        {data.note && (
                            <Text size="xs" c="dimmed" fs="italic">📝 {data.note}</Text>
                        )}
                        {data.measuredAt && (
                            <Group gap={4}>
                                <IconClock size={11} style={{ color: "var(--mantine-color-dimmed)" }} />
                                <Text size="xs" c="dimmed">
                                    {new Date(data.measuredAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                                </Text>
                            </Group>
                        )}
                    </Stack>
                </Box>
            </Collapse>
        </Paper>
    );
}

// ── Patient Summary Card ──────────────────────────────────────────────────────

export function PatientSummaryCard({ data }: Readonly<{ data: PatientSummaryInput }>) {
    const [opened, { toggle }] = useDisclosure(false);
    const hasDiagnoses = data.diagnoses.length > 0;
    const hasMeds = data.medications.length > 0;
    const hasVitals = data.vitals.length > 0;
    const hasAllergies = data.allergies.length > 0;
    const hasRisks = data.riskFactors.length > 0;
    const hasRecs = data.recommendations.length > 0;
    const hasComplaints = data.chiefComplaints.length > 0;

    return (
        <Paper withBorder radius="lg" p={0} style={{ overflow: "hidden", borderLeft: "4px solid var(--mantine-color-primary-5)" }}>
            {/* Header */}
            <UnstyledButton onClick={toggle} style={{ width: "100%", display: "block" }}>
                <Group justify="space-between" px="md" py="sm">
                    <Group gap="xs">
                        <ThemeIcon size={32} radius="md" color="primary" variant="light">
                            <IconNotes size={17} />
                        </ThemeIcon>
                        <Box>
                            <Text fw={600} size="sm">{data.title}</Text>
                            <Text size="xs" c="dimmed">Patient Summary</Text>
                        </Box>
                    </Group>
                    <ActionIcon variant="subtle" color="gray" size="sm">
                        <IconChevronDown size={14} style={{ transform: opened ? "rotate(180deg)" : "none", transition: "transform 150ms ease" }} />
                    </ActionIcon>
                </Group>
            </UnstyledButton>

            <Divider />

            {/* Narrative */}
            <Box px="md" py="sm">
                <Text size="sm" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{data.narrative}</Text>
            </Box>

            {/* Expandable details */}
            <Collapse in={opened}>
                <Divider />
                <Stack gap="sm" px="md" py="sm">
                    {hasComplaints && (
                        <Box>
                            <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4}>Chief Complaints</Text>
                            <Group gap={6} wrap="wrap">
                                {data.chiefComplaints.map((c) => (
                                    <Badge key={c} variant="light" color="orange" size="sm">{c}</Badge>
                                ))}
                            </Group>
                        </Box>
                    )}

                    {hasDiagnoses && (
                        <Box>
                            <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4}>Diagnoses</Text>
                            <Stack gap={4}>
                                {data.diagnoses.map((d) => (
                                    <Group key={d.name} gap={8}>
                                        <Text size="sm" fw={500}>{d.name}</Text>
                                        {d.icd10 && <Badge size="xs" variant="outline" color="gray">{d.icd10}</Badge>}
                                        <Badge size="xs" variant="light" color={d.status === "confirmed" ? "teal" : d.status === "probable" ? "yellow" : "orange"}>
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
                                {data.medications.map((m) => (
                                    <Group key={m.name} gap={6}>
                                        <ThemeIcon size={20} radius="xl" color="violet" variant="light"><IconCapsule size={11} /></ThemeIcon>
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
                                {data.vitals.map((v) => (
                                    <Group key={v.name} gap={6}>
                                        <ThemeIcon size={20} radius="xl" color="red" variant="light"><IconHeartbeat size={11} /></ThemeIcon>
                                        <Text size="xs">{v.name}: <strong>{v.value}{v.unit ? ` ${v.unit}` : ""}</strong></Text>
                                    </Group>
                                ))}
                            </SimpleGrid>
                        </Box>
                    )}

                    {hasAllergies && (
                        <Box>
                            <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4}>Allergies</Text>
                            <Group gap={6} wrap="wrap">
                                {data.allergies.map((a) => (
                                    <Badge key={a} variant="light" color="red" size="sm">{a}</Badge>
                                ))}
                            </Group>
                        </Box>
                    )}

                    {hasRisks && (
                        <Box>
                            <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4}>Risk Factors</Text>
                            <Group gap={6} wrap="wrap">
                                {data.riskFactors.map((r) => (
                                    <Badge key={r} variant="light" color="yellow" size="sm">{r}</Badge>
                                ))}
                            </Group>
                        </Box>
                    )}

                    {hasRecs && (
                        <Box>
                            <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4}>Recommendations</Text>
                            <List size="sm" spacing={4}>
                                {data.recommendations.map((rec) => (
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

// ── Tool Part Dispatcher ──────────────────────────────────────────────────────

export interface ToolPartRendererProps {
    part: UIMessagePart<UIDataTypes, UITools>;
    onAnswer: (toolCallId: string, answer: string) => void;
    answeredIds: ReadonlySet<string>;
    isLoading: boolean;
    onLearnMore?: (text: string) => void;
}

export function ToolPartRenderer({ part, onAnswer, answeredIds, isLoading, onLearnMore }: Readonly<ToolPartRendererProps>) {
    const state = getToolPartState(part);
    const toolName = getToolPartName(part);
    const toolCallId = (part as unknown as { toolCallId?: string }).toolCallId ?? "";
    const isAnswered = answeredIds.has(toolCallId);

    if (state === "input-streaming") {
        const label = (() => {
            if (toolName === "recordCondition") return "Identifying condition…";
            if (toolName === "createPrescription") return "Creating prescription…";
            if (toolName === "addMedicine") return "Documenting medicine…";
            if (toolName === "orderProcedure") return "Ordering procedure…";
            if (toolName === "bookAppointment") return "Scheduling appointment…";
            if (toolName === "recommendProvider") return "Finding provider…";
            if (toolName === "completeAssessment") return "Completing assessment…";
            if (toolName === "askQuestion") return "Preparing question…";
            if (toolName === "suggestActions") return "Preparing your options…";
            if (toolName === "nextSteps") return "Preparing your action plan…";
            if (toolName === "dosDonts") return "Building lifestyle guidance…";
            if (toolName === "dietPlan") return "Creating your diet plan…";
            if (toolName === "soapNote") return "Preparing clinical notes…";
            if (toolName === "dentalChart") return "Mapping dental findings…";
            if (toolName === "logVitals") return "Logging vitals…";
            if (toolName === "generatePatientSummary") return "Generating patient summary…";
            return "Processing…";
        })();
        return (
            <Paper withBorder radius="lg" p="md">
                <Group gap="xs"><Loader size={16} color="primary" /><Text size="sm" c="dimmed" fw={500}>{label}</Text></Group>
            </Paper>
        );
    }

    if (!isToolUIPart(part)) return null;

    const question = extractToolInput<AskQuestionInput>(part, "askQuestion");
    if (question) return <QuestionCard data={question} toolCallId={toolCallId} isAnswered={isAnswered} isLoading={isLoading} onAnswer={onAnswer} />;

    const suggestActions = extractToolInput<SuggestActionsInput>(part, "suggestActions");
    if (suggestActions) return <SuggestActionsCard data={suggestActions} toolCallId={toolCallId} isAnswered={isAnswered} onAnswer={onAnswer} />;

    const condition = extractToolInput<ConditionInput>(part, "recordCondition");
    if (condition) return <ConditionCard data={condition} onLearnMore={onLearnMore} />;

    const prescription = extractToolInput<PrescriptionInput>(part, "createPrescription");
    if (prescription) return <PrescriptionCard data={prescription} />;

    const medicine = extractToolInput<MedicineInput>(part, "addMedicine");
    if (medicine) return <MedicineCard data={medicine} />;

    const procedure = extractToolInput<ProcedureInput>(part, "orderProcedure");
    if (procedure) return <ProcedureCard data={procedure} />;

    const appointment = extractToolInput<AppointmentInput>(part, "bookAppointment");
    if (appointment) return <AppointmentCard data={appointment} />;

    const provider = extractToolInput<ProviderInput>(part, "recommendProvider");
    if (provider) return <ProviderCard data={provider} />;

    const assessment = extractToolInput<AssessmentInput>(part, "completeAssessment");
    if (assessment) return <AssessmentCompleteCard data={assessment} />;

    const nextSteps = extractToolInput<NextStepsInput>(part, "nextSteps");
    if (nextSteps) return <NextStepsCard data={nextSteps} />;

    const dietPlan = extractToolInput<DietPlanInput>(part, "dietPlan");
    if (dietPlan) return <DietPlanCard data={dietPlan} />;

    const soapNote = extractToolInput<SoapNoteInput>(part, "soapNote");
    if (soapNote) return <SoapNoteCard data={soapNote} />;

    const dentalChart = extractToolInput<DentalChartInput>(part, "dentalChart");
    if (dentalChart) return <DentalChartCard data={dentalChart} />;

    const logVitals = extractToolInput<LogVitalsInput>(part, "logVitals");
    if (logVitals) return <LogVitalsCard data={logVitals} />;

    const patientSummary = extractToolInput<PatientSummaryInput>(part, "generatePatientSummary");
    if (patientSummary) return <PatientSummaryCard data={patientSummary} />;

    if (toolName) {
        return (
            <Paper withBorder radius="lg" p="md">
                <Group gap="xs">
                    <ThemeIcon size={28} radius="md" color="gray" variant="light"><IconStethoscope size={15} /></ThemeIcon>
                    <Text size="sm" c="dimmed">Clinical tool: {toolName}</Text>
                </Group>
            </Paper>
        );
    }

    return null;
}
