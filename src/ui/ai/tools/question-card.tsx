"use client";
import { Badge, Button, Card, Chip, Group, Paper, Slider, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconCheck, IconQuestionMark, IconX, IconAlertTriangle, IconThermometer, IconFlame, IconScale, IconMoodSmile, IconMoodSad, IconHeartbeat, IconDroplet, IconClock } from "@tabler/icons-react";
import { useState, type ReactNode } from "react";
import type { AskQuestionInput } from "@/app/(portal)/patient/_types";

export interface QuestionCardProps {
    data: AskQuestionInput;
    toolCallId: string;
    isAnswered: boolean;
    isLoading: boolean;
    onAnswer: (toolCallId: string, answer: string) => void;
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

export function QuestionCard({ data, toolCallId, isAnswered, isLoading, onAnswer }: Readonly<QuestionCardProps>) {
    const [multiSelected, setMultiSelected] = useState<string[]>([]);
    const [scaleValue, setScaleValue] = useState<number>(data.scaleMin ?? 0);
    const disabled = isAnswered || isLoading;

    const scaleMarks = [
        { value: data.scaleMin ?? 0 },
        { value: data.scaleMax ?? 10 },
    ];

    return (
        <Card withBorder radius="lg" p="md">
            <Card.Section withBorder px="md" py="sm" style={{
                background: "light-dark(var(--mantine-color-gray-1),var(--mantine-color-dark-9)",
            }}>
                <Group gap="xs" justify="space-between" wrap="nowrap">
                    <Group gap="xs">
                        <ThemeIcon size={28} radius="md" color="primary" variant="light"><IconQuestionMark size={15} /></ThemeIcon>
                        <Text fw={600} size="sm">{data.question}</Text>
                    </Group>
                    {isAnswered && <Badge color="teal" size="sm" variant="light" leftSection={<IconCheck size={10} />}>Answered</Badge>}
                </Group>
            </Card.Section>
            <Card.Section>
                <Stack gap="md">

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
                                            size="xs"
                                            disabled={disabled}
                                            checked={false}
                                            onChange={() => { if (!disabled) onAnswer(toolCallId, opt); }}
                                            styles={{ label: { cursor: disabled ? "default" : "pointer" } }}
                                        >
                                            {icon ? <Group gap={5} wrap="nowrap">
                                                <ThemeIcon size={16} color="primary" variant="light">{icon}</ThemeIcon>
                                                {opt}</Group> : opt}
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
                                                size="xs"
                                                disabled={disabled}
                                                styles={{ label: { cursor: disabled ? "default" : "pointer" } }}
                                            >
                                                {icon ? <Group gap={5} wrap="nowrap"><ThemeIcon size={16} color="primary" variant="light">{icon}</ThemeIcon>{opt}</Group> : opt}
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
            </Card.Section>
        </Card>
    );
}
