"use client";
import {
    Badge,
    Button,
    Card,
    Chip,
    Group,
    Slider,
    Stack,
    Text,
    ThemeIcon,
} from "@mantine/core";
import { IconCheck, IconX } from "@tabler/icons-react";
import { useState } from "react";
import type { AskQuestionInput } from "@/ui/ai/types";
import { getOptionIcon, getTypeIcon } from "./icons";

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
