"use client";
import { Box, Button, Group, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconChecklist } from "@tabler/icons-react";
import type { SuggestActionsInput, SuggestActionItem } from "@/app/(portal)/patient/_types";

export interface SuggestActionsCardProps {
    data: SuggestActionsInput;
    toolCallId: string;
    isAnswered: boolean;
    onAnswer: (toolCallId: string, answer: string) => void;
}

export function SuggestActionsCard({ data, toolCallId, isAnswered, onAnswer }: Readonly<SuggestActionsCardProps>) {
    return (
        <Paper withBorder radius="lg" p="md">
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
