"use client";
import { Badge, Box, Grid, Group, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconCalendarStats, IconUsers } from "@tabler/icons-react";
import { PresenceCard } from "./_presence-card";

export default function DoctorDashboardPage() {
    return (
        <Stack gap="lg">
            {/* Page title */}
            <Box>
                <Title order={2}>Dashboard</Title>
                <Text c="dimmed" size="sm" mt={4}>
                    Manage your availability and daily schedule.
                </Text>
            </Box>

            <Grid gutter="lg">
                {/* Presence status card */}
                <Grid.Col span={{ base: 12, md: 6, lg: 5 }}>
                    <PresenceCard />
                </Grid.Col>

                {/* Quick stat cards */}
                <Grid.Col span={{ base: 12, md: 6, lg: 7 }}>
                    <Stack gap="md">
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                            <Paper withBorder radius="lg" p="lg">
                                <Group justify="space-between" wrap="nowrap">
                                    <Stack gap={2}>
                                        <Text size="xs" c="dimmed" fw={500} tt="uppercase">
                                            Today&apos;s sessions
                                        </Text>
                                        <Title order={3}>—</Title>
                                        <Text size="xs" c="dimmed">No sessions yet</Text>
                                    </Stack>
                                    <IconCalendarStats
                                        size={32}
                                        color="var(--mantine-color-primary-4)"
                                        style={{ opacity: 0.7 }}
                                    />
                                </Group>
                            </Paper>

                            <Paper withBorder radius="lg" p="lg">
                                <Group justify="space-between" wrap="nowrap">
                                    <Stack gap={2}>
                                        <Text size="xs" c="dimmed" fw={500} tt="uppercase">
                                            Patients today
                                        </Text>
                                        <Title order={3}>—</Title>
                                        <Text size="xs" c="dimmed">No patients yet</Text>
                                    </Stack>
                                    <IconUsers
                                        size={32}
                                        color="var(--mantine-color-primary-4)"
                                        style={{ opacity: 0.7 }}
                                    />
                                </Group>
                            </Paper>
                        </SimpleGrid>

                        {/* Availability tip */}
                        <Paper
                            radius="lg"
                            p="lg"
                            style={{
                                background:
                                    "light-dark(var(--mantine-color-primary-0), rgba(107,79,248,0.08))",
                                border:
                                    "1px solid light-dark(var(--mantine-color-primary-1), rgba(107,79,248,0.15))",
                            }}
                        >
                            <Stack gap="xs">
                                <Group gap="xs">
                                    <Badge color="primary" variant="light" size="sm">Tip</Badge>
                                </Group>
                                <Text size="sm">
                                    Your availability is managed automatically — patients can see
                                    you&apos;re available whenever you&apos;re signed in. Simply sign out
                                    or close the browser when you&apos;re done.
                                </Text>
                            </Stack>
                        </Paper>
                    </Stack>
                </Grid.Col>
            </Grid>
        </Stack>
    );
}
