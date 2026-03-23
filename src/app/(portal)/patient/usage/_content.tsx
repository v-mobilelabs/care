"use client";
import { Box, Container, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconGauge } from "@tabler/icons-react";

import { CreditsCard } from "./_credits-card";
import { StorageCard } from "./_storage-card";
import { ProfilesCard } from "./_profiles-card";
import { CallsCard } from "./_calls-card";
import { UsageKpiCard } from "./_kpi-card";

export function UsageContent() {
    return (
        <Container pt="md">
            <Stack>
                <Group gap="sm">
                    <ThemeIcon size={36} radius="md" color="primary" variant="light">
                        <IconGauge size={20} />
                    </ThemeIcon>
                    <Box>
                        <Title order={4} lh={1.2}>Usage</Title>
                        <Text size="xs" c="dimmed">Your credits and storage at a glance</Text>
                    </Box>
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <UsageKpiCard />
                    <CreditsCard />
                    <StorageCard />
                    <ProfilesCard />
                    <CallsCard />
                </SimpleGrid>
            </Stack>
        </Container>
    );
}
