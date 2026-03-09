"use client";
import { Badge, Box, Collapse, Group, Paper, Stack, Text, ThemeIcon, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCalendar, IconChevronDown } from "@tabler/icons-react";
import type { AppointmentInput } from "@/app/(portal)/chat/_types";

export interface AppointmentCardProps {
    data: AppointmentInput;
}

export function AppointmentCard({ data }: Readonly<AppointmentCardProps>) {
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
