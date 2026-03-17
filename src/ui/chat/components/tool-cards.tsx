"use client";
import {
    Badge,
    Button,
    Card,
    Chip,
    Group,
    Loader,
    Paper,
    Slider,
    Stack,
    Text,
    ThemeIcon,
} from "@mantine/core";
import {
    IconAdjustments,
    IconAlertTriangle,
    IconCheck,
    IconChecklist,
    IconCircleDot,
    IconClock,
    IconDroplet,
    IconExclamationCircle,
    IconFlame,
    IconHandClick,
    IconHeartbeat,
    IconMedicineSyrup,
    IconMoodSad,
    IconMoodSmile,
    IconPencil,
    IconQuestionMark,
    IconScale,
    IconThermometer,
    IconX,
} from "@tabler/icons-react";
import { useState, type ReactNode } from "react";
import { isToolUIPart } from "ai";
import type { UIMessagePart, UIDataTypes, UITools } from "ai";
import { getToolPartName, getToolPartState, extractToolInput } from "@/ui/chat/types";
import type { AskQuestionInput, QuestionType, StartAssessmentInput } from "@/ui/chat/types";
import { AssessmentPrefaceCard } from "@/ui/ai/tools/assessment-preface-card";

// ── Option icon mapping ───────────────────────────────────────────────────────

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

// ── Type-specific question icon ───────────────────────────────────────────────

function getTypeIcon(type: QuestionType): ReactNode {
    switch (type) {
        case "yes_no": return <IconHandClick size={16} />;
        case "single_choice": return <IconCircleDot size={16} />;
        case "multi_choice": return <IconChecklist size={16} />;
        case "scale": return <IconAdjustments size={16} />;
        case "free_text": return <IconPencil size={16} />;
    }
}

// ── Question Card ─────────────────────────────────────────────────────────────

interface QuestionCardProps {
    data: AskQuestionInput;
    toolCallId: string;
    isAnswered: boolean;
    answeredValue?: string;
    isLoading: boolean;
    onAnswer: (toolCallId: string, answer: string) => void;
}

export function QuestionCard({ data, toolCallId, isAnswered, answeredValue, isLoading, onAnswer }: Readonly<QuestionCardProps>) {
    const [multiSelected, setMultiSelected] = useState<string[]>([]);
    const [scaleValue, setScaleValue] = useState<number>(data.scaleMin ?? 0);

    const scaleMarks = [
        { value: data.scaleMin ?? 0 },
        { value: data.scaleMax ?? 10 },
    ];

    return (
        <Card withBorder radius="lg"
            shadow="xs"
        >
            <Card.Section withBorder p="sm" style={{ background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))" }}>
                {/* Header — type icon + question + optional answered badge */}
                <Stack gap={2}>
                    <Group gap="xs" wrap="nowrap" align="flex-start">
                        <ThemeIcon size={32} radius="md" color="primary" variant="light" style={{ flexShrink: 0 }}>{getTypeIcon(data.type)}</ThemeIcon>
                        <Stack gap={"2"}>
                            <Text fw={500} size="sm">{data.question}</Text>
                            {isAnswered && <Badge color="teal" size="xs" variant="light" leftSection={<IconCheck size={10} />}>Answered</Badge>}
                        </Stack>
                    </Group>
                </Stack>
            </Card.Section>
            <Card.Section px="sm" py="sm">
                <Stack gap="md">
                    {/* Show the user's answer when answered */}
                    {isAnswered && answeredValue && (
                        <Text size="sm" c="dimmed">Your answer: <Text span fw={600} c="primary">{answeredValue}</Text></Text>
                    )}

                    {/* ── Yes / No ────────────────────────────────────────────── */}
                    {data.type === "yes_no" && !isAnswered && (
                        <Group gap="xs">
                            <Button size="md" color="primary" variant="outline" disabled={isLoading} leftSection={<IconCheck size={16} />} onClick={() => onAnswer(toolCallId, "Yes")}>Yes</Button>
                            <Button size="md" color="primary" variant="outline" disabled={isLoading} leftSection={<IconX size={16} />} onClick={() => onAnswer(toolCallId, "No")}>No</Button>
                        </Group>
                    )}

                    {/* ── Single choice ───────────────────────────────────────── */}
                    {data.type === "single_choice" && data.options && !isAnswered && (
                        <Chip.Group>
                            <Group gap="sm" wrap="wrap">
                                {data.options.map((opt) => {
                                    const icon = getOptionIcon(opt);
                                    return (
                                        <Chip
                                            key={opt}
                                            value={opt}
                                            color="primary"
                                            variant="outline"
                                            size="sm"
                                            radius="xl"
                                            disabled={isLoading}
                                            checked={false}
                                            onChange={() => { if (!isLoading) onAnswer(toolCallId, opt); }}
                                        >
                                            {icon ? <Group gap={5} wrap="nowrap">{icon}{opt}</Group> : opt}
                                        </Chip>
                                    );
                                })}
                            </Group>
                        </Chip.Group>
                    )}

                    {/* ── Multi choice ────────────────────────────────────────── */}
                    {data.type === "multi_choice" && data.options && !isAnswered && (
                        <Stack gap="sm">
                            <Chip.Group multiple value={multiSelected} onChange={isLoading ? undefined : setMultiSelected}>
                                <Group gap="xs" wrap="wrap">
                                    {data.options.map((opt) => {
                                        const icon = getOptionIcon(opt);
                                        return (
                                            <Chip
                                                key={opt}
                                                value={opt}
                                                color="primary"
                                                variant="light"
                                                size="md"
                                                radius="xl"
                                                disabled={isLoading}
                                            >
                                                {icon ? <Group gap={5} wrap="nowrap">{icon}{opt}</Group> : opt}
                                            </Chip>
                                        );
                                    })}
                                </Group>
                            </Chip.Group>
                            <Button
                                size="md"
                                color="primary"
                                disabled={multiSelected.length === 0}
                                onClick={() => onAnswer(toolCallId, multiSelected.join(", "))}
                            >
                                Confirm {multiSelected.length} selected
                            </Button>
                        </Stack>
                    )}

                    {/* ── Scale ───────────────────────────────────────────────── */}
                    {data.type === "scale" && !isAnswered && (
                        <Stack gap="md">
                            <Text ta="center" fw={700} size="xl" c="primary">{scaleValue}</Text>
                            <Stack gap={4}>
                                <Slider min={data.scaleMin ?? 0} max={data.scaleMax ?? 10} step={1} value={scaleValue} onChange={setScaleValue} disabled={isLoading} marks={scaleMarks} color="primary" size="lg" />
                                <Group justify="space-between" mt="xs">
                                    <Text size="sm" c="dimmed">{data.scaleMinLabel ?? String(data.scaleMin ?? 0)}</Text>
                                    <Text size="sm" c="dimmed">{data.scaleMaxLabel ?? String(data.scaleMax ?? 10)}</Text>
                                </Group>
                            </Stack>
                            <Button size="md" color="primary" onClick={() => onAnswer(toolCallId, String(scaleValue))}>
                                Submit: {scaleValue}
                            </Button>
                        </Stack>
                    )}
                </Stack>

                {/* Free text uses the chat input bar — no inline textarea */}
            </Card.Section>
        </Card>
    );
}

// ── Friendly tool name mapping ────────────────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
    startAssessment: "Preparing assessment…",
    recordCondition: "Recording condition…",
    generatePrescription: "Preparing prescription…",
    suggestBloodTests: "Analyzing blood tests…",
    generateDietPlan: "Creating diet plan…",
    generateSoapNote: "Writing clinical note…",
};

// ── Tool Part Dispatcher ──────────────────────────────────────────────────────

export interface ToolPartRendererProps {
    part: UIMessagePart<UIDataTypes, UITools>;
    onAnswer: (toolCallId: string, answer: string) => void;
    onApproval: (opts: { id: string; approved: boolean; reason?: string }) => void;
    answeredIds: ReadonlyMap<string, string>;
    isLoading: boolean;
    onLearnMore?: (text: string) => void;
}

export function ToolPartRenderer({ part, onAnswer, onApproval, answeredIds, isLoading }: Readonly<ToolPartRendererProps>) {
    const state = getToolPartState(part);
    const toolName = getToolPartName(part);
    const toolCallId = (part as unknown as { toolCallId?: string }).toolCallId ?? "";
    const isAnswered = answeredIds.has(toolCallId);
    const answeredValue = answeredIds.get(toolCallId);

    if (state === "output-error") {
        return (
            <Paper withBorder radius="lg" p="md" style={{ borderColor: "var(--mantine-color-red-4)" }}>
                <Group gap="xs">
                    <ThemeIcon size={28} radius="md" color="red" variant="light"><IconExclamationCircle size={15} /></ThemeIcon>
                    <Text size="sm" c="red">Failed to process{toolName ? ` (${toolName})` : ""}. Please try again.</Text>
                </Group>
            </Paper>
        );
    }

    if (state === "input-streaming") {
        const label = toolName === "askQuestion" ? "Preparing question…" : (TOOL_LABELS[toolName ?? ""] ?? "Processing…");
        return (
            <Paper withBorder radius="lg" p="md">
                <Group gap="xs"><Loader size={16} color="primary" /><Text size="sm" c="dimmed" fw={500}>{label}</Text></Group>
            </Paper>
        );
    }

    if (!isToolUIPart(part)) return null;

    const assessmentPreface = extractToolInput<StartAssessmentInput>(part, "startAssessment");
    if (assessmentPreface) return <AssessmentPrefaceCard data={assessmentPreface} />;

    const question = extractToolInput<AskQuestionInput>(part, "askQuestion");
    if (question) return <QuestionCard data={question} toolCallId={toolCallId} isAnswered={isAnswered} answeredValue={answeredValue} isLoading={isLoading} onAnswer={onAnswer} />;

    // ── Approval-requested (e.g. submitPrescription) ────────────────────────
    if (state === "approval-requested") {
        const approval = (part as unknown as { approval?: { id: string } }).approval;
        const input = (part as unknown as { input?: unknown }).input;
        const medNames =
            input && typeof input === "object" && Array.isArray((input as Record<string, unknown>).medications)
                ? ((input as Record<string, unknown>).medications as { name: string }[]).map((m) => m.name).join(", ")
                : null;
        return (
            <Paper withBorder radius="lg" p="md" style={{ borderColor: "var(--mantine-color-orange-4)" }}>
                <Stack gap="sm">
                    <Group gap="xs">
                        <ThemeIcon size={28} radius="md" color="orange" variant="light"><IconMedicineSyrup size={15} /></ThemeIcon>
                        <Text size="sm" fw={600}>Prescription ready — approve to save</Text>
                    </Group>
                    {medNames && <Text size="xs" c="dimmed">{medNames}</Text>}
                    <Group gap="sm">
                        <Button size="sm" color="teal" leftSection={<IconCheck size={14} />}
                            onClick={() => approval && onApproval({ id: approval.id, approved: true })}>
                            Approve
                        </Button>
                        <Button size="sm" color="red" variant="outline" leftSection={<IconX size={14} />}
                            onClick={() => approval && onApproval({ id: approval.id, approved: false, reason: "Patient declined" })}>
                            Decline
                        </Button>
                    </Group>
                </Stack>
            </Paper>
        );
    }

    return null;
}
