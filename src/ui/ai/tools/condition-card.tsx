"use client";
import { Badge, Box, Button, Collapse, Divider, Group, Paper, Stack, Text, ThemeIcon, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCheck, IconChevronDown, IconCircleCheck, IconMessageQuestion, IconQuestionMark, IconAlertTriangle, IconStethoscope } from "@tabler/icons-react";
import { SEVERITY_COLOR } from "@/app/(portal)/patient/_types";
import type { ConditionInput } from "@/app/(portal)/patient/_types";

export interface ConditionCardProps {
    data: ConditionInput;
    onLearnMore?: (text: string) => void;
}

export function ConditionCard({ data, onLearnMore }: Readonly<ConditionCardProps>) {
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
