"use client";
import { Badge, Box, Group, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconClipboardHeart, IconClock, IconListCheck, IconStethoscope } from "@tabler/icons-react";

export interface StartAssessmentInput {
    title: string;
    condition: string;
    guideline: string;
    estimatedQuestions: number;
    estimatedMinutes: string;
}

export function AssessmentPrefaceCard({ data }: Readonly<{ data: StartAssessmentInput }>) {
    return (
        <Paper withBorder radius="lg" p={0} style={{
            overflow: "hidden",
            borderLeft: "4px solid var(--mantine-color-primary-5)",
        }}>
            <Box px="md" py="sm" style={{
                background: "light-dark(var(--mantine-color-primary-0), rgba(99, 102, 241, 0.08))",
            }}>
                <Group gap="sm" wrap="nowrap" align="center">
                    <ThemeIcon size={32} radius="md" color="primary" variant="filled" style={{ flexShrink: 0 }}>
                        <IconClipboardHeart size={16} />
                    </ThemeIcon>
                    <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1, marginBottom: 1 }}>
                            Starting Assessment
                        </Text>
                        <Text fw={700} size="sm" style={{ lineHeight: 1.3 }}>
                            {data.title}
                        </Text>
                    </Box>
                </Group>
            </Box>

            <Stack gap="xs" px="md" py="sm">
                <Group gap="xl" wrap="wrap">
                    <Group gap={6} wrap="nowrap">
                        <ThemeIcon size={20} radius="xl" color="primary" variant="light">
                            <IconListCheck size={11} />
                        </ThemeIcon>
                        <Text size="sm" fw={500}>~{data.estimatedQuestions} questions</Text>
                    </Group>
                    <Group gap={6} wrap="nowrap">
                        <ThemeIcon size={20} radius="xl" color="primary" variant="light">
                            <IconClock size={11} />
                        </ThemeIcon>
                        <Text size="sm" fw={500}>~{data.estimatedMinutes} min</Text>
                    </Group>
                </Group>

                <Group gap={6} wrap="nowrap">
                    <ThemeIcon size={20} radius="xl" color="teal" variant="light">
                        <IconStethoscope size={11} />
                    </ThemeIcon>
                    <Text size="sm">
                        Following <Text span fw={600}>{data.guideline}</Text>
                    </Text>
                </Group>

                <Text size="xs" c="dimmed" lh={1.5}>
                    This structured assessment helps evaluate your symptoms systematically.
                    Your answers are stored securely and can be shared with your doctor.
                </Text>
            </Stack>
        </Paper>
    );
}
