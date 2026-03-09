"use client";
import { Alert, Badge, Box, Collapse, Group, Paper, Stack, Text, ThemeIcon, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertTriangle, IconChevronDown, IconFlask } from "@tabler/icons-react";
import { PRIORITY_COLOR } from "@/app/(portal)/chat/_types";
import type { ProcedureInput } from "@/app/(portal)/chat/_types";

export interface ProcedureCardProps {
    data: ProcedureInput;
}

export function ProcedureCard({ data }: Readonly<ProcedureCardProps>) {
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
