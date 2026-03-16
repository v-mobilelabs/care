"use client";
import { Card, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconGauge } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

// Replace with your actual query key and fetcher
import { chatKeys } from "@/app/(portal)/patient/_keys";

export function UsageKpiCard() {
    const { data, isLoading, isError } = useQuery({
        queryKey: chatKeys.usage(),
        queryFn: () => fetch("/api/usage").then((res) => res.json()),
        staleTime: 60_000,
    });

    if (isLoading) return <Card radius="md">Loading...</Card>;
    if (isError || !data) return <Card radius="md">Failed to load usage KPI</Card>;

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
