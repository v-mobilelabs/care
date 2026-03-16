"use client";
import { Box, Card, Group, ScrollArea, SimpleGrid, Text, ThemeIcon, Title } from "@mantine/core";
import { IconGauge } from "@tabler/icons-react";

import { CreditsCard } from "./_credits-card";
import { StorageCard } from "./_storage-card";
import { ProfilesCard } from "./_profiles-card";
import { CallsCard } from "./_calls-card";
import { UsageKpiCard } from "./_kpi-card";

export function UsageContent() {
    return (
        <ScrollArea style={{ flex: 1 }} styles={{ viewport: { height: "100%" } }}>
            <Box px={{ base: "md", sm: "xl" }} py="lg" maw={900} mx="auto">
                <Card radius="xl" withBorder>
                    <Card.Section bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))" px="md" py="md" withBorder>
                        <Group gap="sm">
                            <ThemeIcon size={36} radius="md" color="primary" variant="light">
                                <IconGauge size={20} />
                            </ThemeIcon>
                            <Box>
                                <Title order={4} lh={1.2}>Usage</Title>
                                <Text size="xs" c="dimmed">Your credits and storage at a glance</Text>
                            </Box>
                        </Group>
                    </Card.Section>
                    <Card.Section p="md">
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                            <UsageKpiCard />
                            <CreditsCard />
                            <StorageCard />
                            <ProfilesCard />
                            <CallsCard />
                        </SimpleGrid>
                    </Card.Section>
                </Card>
            </Box>
        </ScrollArea>
    );
}
