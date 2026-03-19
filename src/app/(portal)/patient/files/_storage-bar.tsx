"use client";
import {
    Badge,
    Box,
    Group,
    Paper,
    Progress,
    Skeleton,
    Text,
    ThemeIcon,
} from "@mantine/core";
import { IconDatabase } from "@tabler/icons-react";

import { useStorageMetricsQuery } from "@/app/(portal)/patient/_query";

export function StorageBar() {
    const { data: metrics, isLoading } = useStorageMetricsQuery();

    if (isLoading) return <Skeleton height={52} radius="md" />;
    if (!metrics) return null;

    const usedMB = metrics.usedBytes / (1024 * 1024);
    const limitMB = metrics.limitBytes / (1024 * 1024);
    const pct = Math.min((metrics.usedBytes / metrics.limitBytes) * 100, 100);
    const barColor = (() => {
        if (pct >= 90) return "red";
        if (pct >= 75) return "orange";
        return "primary";
    })();

    return (
        <Paper withBorder radius="md" p="sm">
            <Group gap="xs" mb={6}>
                <ThemeIcon size={20} radius="sm" color={barColor} variant="light">
                    <IconDatabase size={12} />
                </ThemeIcon>
                <Text size="xs" fw={600}>Storage</Text>
                <Text size="xs" c="dimmed" ml="auto">
                    {usedMB.toFixed(1)} MB of {limitMB.toFixed(0)} MB used
                </Text>
                <Badge size="xs" color={barColor} variant="light" radius="sm">
                    {pct.toFixed(0)}%
                </Badge>
            </Group>
            <Progress value={pct} color={barColor} size="sm" radius="xl" />
        </Paper>
    );
}
