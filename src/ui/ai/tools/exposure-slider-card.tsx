"use client";

import { Button, Card, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconAdjustments, IconCheck } from "@tabler/icons-react";
import { useState } from "react";
import { ExposureSlider } from "./exposure-slider";

export interface ExposureSliderInput {
    min?: number;
    max?: number;
    step?: number;
    defaultValue?: number;
    promptText: string;
}

interface ExposureSliderCardProps {
    data: ExposureSliderInput;
    toolCallId: string;
    isAnswered: boolean;
    answeredValue?: string;
    isLoading: boolean;
    onAnswer: (toolCallId: string, answer: string) => void;
}

export function ExposureSliderCard({
    data,
    toolCallId,
    isAnswered,
    answeredValue,
    isLoading,
    onAnswer,
}: Readonly<ExposureSliderCardProps>) {
    const [val, setVal] = useState<number>(data.defaultValue ?? 5);

    return (
        <Card withBorder radius="lg" shadow="xs">
            <Card.Section
                withBorder
                p="sm"
                style={{
                    background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))",
                }}
            >
                <Group gap="xs" wrap="nowrap" align="flex-start">
                    <ThemeIcon size={32} radius="md" color="primary" variant="light" style={{ flexShrink: 0 }}>
                        <IconAdjustments size={16} />
                    </ThemeIcon>
                    <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                        <Text fw={500} size="sm">
                            {data.promptText}
                        </Text>
                        {isAnswered && (
                            <Group gap={4}>
                                <ThemeIcon size={16} radius="xl" color="teal" variant="light">
                                    <IconCheck size={10} />
                                </ThemeIcon>
                                <Text size="xs" c="teal" fw={600}>
                                    Submitted
                                </Text>
                            </Group>
                        )}
                    </Stack>
                </Group>
            </Card.Section>

            <Card.Section px="sm" py="sm">
                <Stack gap="md" align="center">
                    {isAnswered && answeredValue && (
                        <Text size="sm" c="dimmed">
                            Selected Exposure: <Text span fw={600} c="primary">{answeredValue}</Text>
                        </Text>
                    )}

                    {!isAnswered && (
                        <Stack gap="md" align="center" style={{ width: "100%" }}>
                            <ExposureSlider
                                min={data.min}
                                max={data.max}
                                step={data.step}
                                defaultValue={data.defaultValue}
                                onChange={setVal}
                                disabled={isLoading}
                            />
                            <Button
                                size="md"
                                color="primary"
                                style={{ width: "100%" }}
                                onClick={() => onAnswer(toolCallId, String(val))}
                            >
                                Submit Exposure: {val}
                            </Button>
                        </Stack>
                    )}
                </Stack>
            </Card.Section>
        </Card>
    );
}
