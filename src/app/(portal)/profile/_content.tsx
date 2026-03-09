"use client";
import { Box, Skeleton } from "@mantine/core";
import { useAuth } from "@/ui/providers/auth-provider";
import { ProfileContent } from "@/app/(portal)/patient/profile/_content";
import { DoctorProfileContent } from "./_doctor-content";

/**
 * Detects user.kind and renders the appropriate profile form.
 * Patient -> ProfileContent (chat profile sections)
 * Doctor  -> DoctorProfileContent (professional info + avatar)
 */
export function ProfilePageContent() {
    const { kind, loading } = useAuth();

    if (loading || kind === null) {
        return (
            <Box style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
                <Skeleton height={56} mb={0} radius={0} />
                <Box px={{ base: "md", sm: "xl" }} py="lg" maw={600} mx="auto" style={{ width: "100%" }}>
                    <Skeleton height={200} radius="lg" mb="md" />
                    <Skeleton height={160} radius="lg" mb="md" />
                    <Skeleton height={120} radius="lg" />
                </Box>
            </Box>
        );
    }

    if (kind === "doctor") {
        return (
            <Box style={{ minHeight: "100dvh", overflowY: "auto" }}>
                <Box maw={720} mx="auto" px={{ base: "md", sm: "xl" }} py="xl">
                    <DoctorProfileContent />
                </Box>
            </Box>
        );
    }

    // Patient / user — use the full ProfileContent from the chat module
    return (
        <Box style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <ProfileContent />
        </Box>
    );
}
