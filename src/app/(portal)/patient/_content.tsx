"use client";
import { Box, Group, ScrollArea, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconRuler } from "@tabler/icons-react";

import { useProfileQuery, useUpsertProfileMutation } from "@/app/(portal)/chat/_query";
import { HealthInfoSection } from "@/app/(portal)/chat/profile/_sections/health-info";

export function PatientPageContent() {
    const { data: healthProfile } = useProfileQuery();
    const upsertProfile = useUpsertProfileMutation();

    return (
        <Box style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            {/* Page header */}
            <Box
                px={{ base: "md", sm: "xl" }}
                py="md"
                style={{
                    flexShrink: 0,
                    borderBottom: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                    background: "light-dark(white, var(--mantine-color-dark-8))",
                }}
            >
                <Group gap="sm">
                    <ThemeIcon size={34} radius="md" color="teal" variant="light">
                        <IconRuler size={18} />
                    </ThemeIcon>
                    <Box>
                        <Title order={5} lh={1.2}>Physical Details</Title>
                        <Text size="xs" c="dimmed">Your body metrics, used to personalise AI assessments</Text>
                    </Box>
                </Group>
            </Box>

            {/* Scrollable content */}
            <Box style={{ flex: 1, overflow: "hidden" }}>
                <ScrollArea style={{ height: "100%" }}>
                    <Box px={{ base: "md", sm: "xl" }} py="lg" maw={600} mx="auto">
                        <Stack gap="md">
                            <HealthInfoSection
                                healthProfile={healthProfile}
                                upsertProfile={upsertProfile}
                            />
                        </Stack>
                    </Box>
                </ScrollArea>
            </Box>
        </Box>
    );
}
