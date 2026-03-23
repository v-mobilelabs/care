"use client";
import { Card, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconGauge } from "@tabler/icons-react";

import { useCreditsQuery } from "@/app/(portal)/patient/_query";
import { UsageCardError, UsageCardSkeleton } from "./_shared";

export function UsageKpiCard() {
    const { data, isLoading, isError } = useCreditsQuery();

    if (isLoading) return <UsageCardSkeleton />;
    if (isError || !data) return <UsageCardError title="Usage KPI" subtitle="Overview of your usage metrics" />;

    return (
        <Card radius="md" withBorder>
            <Group gap="xs">
                <ThemeIcon size={30} radius="md" color="primary" variant="light">
                    <IconGauge size={16} />
                </ThemeIcon>
                <Stack gap={2}>
                    <Text fw={600} size="sm" lh={1.2}>Usage KPI</Text>
                    <Text size="xs" c="dimmed">Credits: {data.credits} · Minutes: {data.minutes} · Storage: {data.storage}MB</Text>
                    <Text size="xs" c="dimmed">Last Reset: {data.lastReset}</Text>
                </Stack>
            </Group>
        </Card>
    );
}
