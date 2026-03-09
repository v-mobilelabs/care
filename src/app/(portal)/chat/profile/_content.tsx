"use client";
import { Box, Group, ScrollArea, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconUser } from "@tabler/icons-react";

import { useAuth } from "@/ui/providers/auth-provider";
import {
    useProfileQuery,
    useDependentsQuery,
    chatKeys,
} from "@/app/(portal)/chat/_query";
import { useQueryClient } from "@tanstack/react-query";
import { useActiveProfile } from "@/app/(portal)/chat/_context/active-profile-context";
import { bmiInfo } from "./_shared";
import { HeroCard } from "./_sections/hero-card";
import { PersonalInfoSection } from "./_sections/personal-info";
import { LocationInfoSection } from "./_sections/location-info";
import { DependentProfileContent } from "./_sections/family";
import { DangerSection } from "./_sections/settings";
import { getInitials } from "@/lib/get-initials";

export function ProfileContent() {
    const { user, refreshUser } = useAuth();
    const { activeDependentId } = useActiveProfile();
    const qc = useQueryClient();

    const { data: healthProfile } = useProfileQuery();
    const { data: dependents = [] } = useDependentsQuery();

    const activeDependent = activeDependentId
        ? (dependents.find((d) => d.id === activeDependentId) ?? null)
        : null;

    // Dependent view
    if (activeDependentId) {
        if (!activeDependent) return null;
        return <DependentProfileContent dep={activeDependent} />;
    }

    const displayName = healthProfile?.name ?? user?.displayName ?? null;
    const initials = getInitials(displayName, user?.email);

    const bmi =
        healthProfile?.height && healthProfile?.weight
            ? bmiInfo(healthProfile.height, healthProfile.weight)
            : null;

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
                    <ThemeIcon size={34} radius="md" color="primary" variant="light">
                        <IconUser size={18} />
                    </ThemeIcon>
                    <Box>
                        <Title order={5} lh={1.2}>Profile</Title>
                        <Text size="xs" c="dimmed">Manage your personal &amp; health information</Text>
                    </Box>
                </Group>
            </Box>

            {/* Scrollable sections */}
            <Box style={{ flex: 1, overflow: "hidden" }}>
                <ScrollArea style={{ height: "100%" }}>
                    <Box px={{ base: "md", sm: "xl" }} py="lg" maw={600} mx="auto">
                        <Stack gap="md">
                            <HeroCard
                                photoURL={healthProfile?.photoUrl ?? user?.photoURL ?? null}
                                email={user?.email ?? null}
                                emailVerified={user?.emailVerified ?? false}
                                initials={initials}
                                healthProfile={healthProfile}
                                isProfileLoaded={healthProfile !== undefined}
                                bmi={bmi}
                                onAvatarUpdated={() => {
                                    refreshUser();
                                    void qc.invalidateQueries({ queryKey: chatKeys.profile() });
                                }}
                            />
                            <PersonalInfoSection />
                            <LocationInfoSection
                                healthProfile={healthProfile}
                            />
                            <DangerSection />
                        </Stack>
                    </Box>
                </ScrollArea>
            </Box>
        </Box>
    );
}
