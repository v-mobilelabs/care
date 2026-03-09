"use client";
import { Badge, Box, Group, Paper, Text, ThemeIcon } from "@mantine/core";
import { IconStethoscope } from "@tabler/icons-react";
import { URGENCY_COLOR } from "@/app/(portal)/chat/_types";
import type { ProviderInput } from "@/app/(portal)/chat/_types";

export interface ProviderCardProps {
    data: ProviderInput;
}

export function ProviderCard({ data }: Readonly<ProviderCardProps>) {
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
