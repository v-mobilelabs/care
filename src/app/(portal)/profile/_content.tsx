"use client";
import { Box, Container, ScrollArea, Stack } from "@mantine/core";
import { useAuth } from "@/ui/providers/auth-provider";
import {
    useProfileQuery,
    chatKeys,
} from "@/app/(portal)/patient/_query";
import { useQueryClient } from "@tanstack/react-query";
import { HeroCard } from "./_sections/hero-card";
import { PersonalInfoSection } from "./_sections/personal-info";
import { LocationInfoSection } from "./_sections/location-info";
import { DangerSection } from "./_sections/settings";

export function ProfileContent() {
    const { user, refreshUser } = useAuth();
    const qc = useQueryClient();
    const email = user?.email ?? null;
    const { data: profile } = useProfileQuery();

    return (
        <Container pt="md">
            <Box style={{ flex: 1, overflow: "hidden" }}>
                <ScrollArea style={{ height: "100%" }}>
                    <Box maw={600} mx="auto">
                        <Stack gap="md">
                            <HeroCard
                                email={email}
                                emailVerified={user?.emailVerified ?? false}
                                profile={profile}
                                onAvatarUpdated={() => {
                                    refreshUser();
                                    void qc.invalidateQueries({ queryKey: chatKeys.profile() });
                                }}
                            />
                            <PersonalInfoSection />
                            <LocationInfoSection
                                profile={profile}
                            />
                            <DangerSection />
                        </Stack>
                    </Box>
                </ScrollArea>
            </Box>
        </Container>
    );
}
