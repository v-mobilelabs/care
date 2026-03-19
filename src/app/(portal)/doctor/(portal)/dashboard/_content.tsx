"use client";
import { Box, Grid, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconCalendarStats, IconUsers } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import type { ProfileDto } from "@/data/profile";
import { PatientsQueue } from "./_patients-queue";
import { iosCard, iosLargeTitle, iosSubtitle, ios, allKeyframes } from "@/ui/ios";

function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
}

function IosStatCard({
    label,
    value,
    subtitle,
    icon,
    delay,
}: Readonly<{
    label: string;
    value: string;
    subtitle: string;
    icon: React.ReactNode;
    delay: string;
}>) {
    return (
        <Box
            p="lg"
            style={{
                ...iosCard,
                animation: ios.animation.scaleIn(delay),
            }}
        >
            <Group justify="space-between" wrap="nowrap">
                <Stack gap={4}>
                    <Text
                        size="xs"
                        c="dimmed"
                        fw={600}
                        style={{
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            fontSize: 11,
                        }}
                    >
                        {label}
                    </Text>
                    <Text
                        fw={700}
                        style={{ fontSize: 28, lineHeight: 1 }}
                    >
                        {value}
                    </Text>
                    <Text size="xs" c="dimmed">
                        {subtitle}
                    </Text>
                </Stack>
                <Box
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        background:
                            "light-dark(rgba(99,102,241,0.08), rgba(99,102,241,0.12))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--mantine-color-primary-5)",
                    }}
                >
                    {icon}
                </Box>
            </Group>
        </Box>
    );
}

export function DashboardContent() {
    const { data: myProfile } = useQuery<ProfileDto>({
        queryKey: ["profile"],
        staleTime: Infinity,
    });

    const firstName = myProfile?.name?.split(" ")[0] ?? "Doctor";

    return (
        <Stack gap="xl">
            <style>{allKeyframes}</style>

            {/* iOS large title hero */}
            <Box style={{ animation: ios.animation.fadeSlideUp() }}>
                <Text style={iosLargeTitle}>
                    {getGreeting()}, Dr.&nbsp;{firstName}
                </Text>
                <Text style={{ ...iosSubtitle, marginTop: 4 }}>
                    Here&apos;s your overview for today.
                </Text>
            </Box>

            <Grid gutter="lg">
                {/* Patients in queue */}
                <Grid.Col span={{ base: 12, md: 6, lg: 5 }}>
                    <PatientsQueue />
                </Grid.Col>

                {/* Quick stat cards */}
                <Grid.Col span={{ base: 12, md: 6, lg: 7 }}>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                        <IosStatCard
                            label="Today's sessions"
                            value="—"
                            subtitle="No sessions yet"
                            icon={<IconCalendarStats size={24} />}
                            delay="100ms"
                        />
                        <IosStatCard
                            label="Patients today"
                            value="—"
                            subtitle="No patients yet"
                            icon={<IconUsers size={24} />}
                            delay="200ms"
                        />
                    </SimpleGrid>
                </Grid.Col>
            </Grid>
        </Stack>
    );
}
