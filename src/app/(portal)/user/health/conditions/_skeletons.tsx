"use client";
import { Box, Group, Skeleton, Stack, ThemeIcon } from "@mantine/core";
import { IconHeartbeat } from "@tabler/icons-react";

export function ConditionSkeletons() {
    return (
        <Stack gap="sm">
            {Array.from({ length: 5 }).map((_, i) => (
                <Box
                    key={i}
                    p="md"
                    style={(t) => ({
                        border: `1px solid ${t.colors.gray[2]}`,
                        borderRadius: t.radius.md,
                    })}
                >
                    <Group justify="space-between">
                        <Group gap="sm">
                            <Skeleton circle h={36} w={36} />
                            <Stack gap={4}>
                                <Skeleton height={14} width={180} />
                                <Skeleton height={10} width={120} />
                            </Stack>
                        </Group>
                        <Group gap="xs">
                            <Skeleton height={20} width={60} radius="xl" />
                            <Skeleton height={20} width={70} radius="xl" />
                        </Group>
                    </Group>
                </Box>
            ))}
        </Stack>
    );
}

export function EmptyState() {
    return (
        <Stack align="center" py="xl" gap="sm">
            <ThemeIcon size={56} radius="xl" variant="light" color="teal">
                <IconHeartbeat size={28} />
            </ThemeIcon>
            <Stack gap={4} align="center">
                <Box fw={600} style={{ fontSize: 16 }}>
                    No conditions recorded
                </Box>
                <Box c="dimmed" style={{ fontSize: 14, textAlign: "center" }}>
                    Your diagnosed or monitored conditions will appear here.
                </Box>
            </Stack>
        </Stack>
    );
}
