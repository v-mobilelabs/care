"use client";
import { Box, Group, ScrollArea, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconUser } from "@tabler/icons-react";

import { useAuth } from "@/ui/providers/auth-provider";
import {
    useProfileQuery,
    useUpsertProfileMutation,
    useDependentsQuery,
} from "@/app/chat/_query";
import { useActiveProfile } from "@/app/chat/_context/active-profile-context";
import { bmiInfo } from "./_shared";
import { HeroCard } from "./_sections/hero-card";
import { PersonalInfoSection } from "./_sections/personal-info";
import { HealthInfoSection } from "./_sections/health-info";
import { FamilySection, DependentProfileContent } from "./_sections/family";
import { ConsentSection, DangerSection } from "./_sections/settings";

export function ProfileContent() {
    const { user, refreshUser } = useAuth();
    const { activeDependentId } = useActiveProfile();

    const { data: healthProfile } = useProfileQuery();
    const upsertProfile = useUpsertProfileMutation();
    const { data: dependents = [] } = useDependentsQuery();

    const activeDependent = activeDependentId
        ? (dependents.find((d) => d.id === activeDependentId) ?? null)
        : null;

    // Dependent view
    if (activeDependentId) {
        if (!activeDependent) return null;
        return <DependentProfileContent dep={activeDependent} />;
    }

    const initials = user?.displayName
        ? user.displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
        : user?.email?.[0]?.toUpperCase() ?? "?";

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
                                user={user}
                                initials={initials}
                                healthProfile={healthProfile}
                                isProfileLoaded={healthProfile !== undefined}
                                bmi={bmi}
                                onAvatarUpdated={refreshUser}
                            />
                            <PersonalInfoSection />
                            <HealthInfoSection
                                healthProfile={healthProfile}
                                upsertProfile={upsertProfile}
                            />
                            <FamilySection dependents={dependents} />
                            <ConsentSection />
                            <DangerSection />
                        </Stack>
                    </Box>
                </ScrollArea>
            </Box>
        </Box>
    );
}
