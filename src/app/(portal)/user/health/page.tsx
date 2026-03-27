import { Suspense } from "react";
import { Container, Stack, Title, Text } from "@mantine/core";
import { getQueryClient } from "@/lib/query/client";
import { getServerUser } from "@/lib/api/server-prefetch";
import { Hydrate } from "@/ui/hydrate";
import { chatKeys } from "@/app/(portal)/user/_keys";
import {
    getCachedVitals,
    getCachedMedications,
    getCachedConditions,
    getCachedAssessments,
} from "@/data/cached";
import { HealthHubContent } from "./_content";
import HealthLoading from "./loading";

async function HealthHubData({ userId }: Readonly<{ userId: string }>) {
    const queryClient = getQueryClient();
    await Promise.all([
        queryClient.prefetchQuery({
            queryKey: [...chatKeys.vitals(), undefined],
            queryFn: () => getCachedVitals(userId),
        }),
        queryClient.prefetchQuery({
            queryKey: [...chatKeys.medications(), undefined],
            queryFn: () => getCachedMedications(userId),
        }),
        queryClient.prefetchQuery({
            queryKey: [...chatKeys.conditions(), undefined],
            queryFn: () => getCachedConditions(userId),
        }),
        queryClient.prefetchQuery({
            queryKey: [...chatKeys.assessments(), undefined],
            queryFn: () => getCachedAssessments(userId),
        }),
    ]);
    return (
        <Hydrate client={queryClient}>
            <HealthHubContent />
        </Hydrate>
    );
}

export default async function HealthHubPage() {
    const user = await getServerUser();
    return (
        <Container size="xl" pt="md">
            <Stack gap="xl">
                <Stack gap={4}>
                    <Title order={2} style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)" }}>
                        Your Health
                    </Title>
                    <Text c="dimmed" size="sm">
                        All your health data in one place
                    </Text>
                </Stack>
                {user ? (
                    <Suspense fallback={<HealthLoading />}>
                        <HealthHubData userId={user.uid} />
                    </Suspense>
                ) : (
                    <HealthHubContent />
                )}
            </Stack>
        </Container>
    );
}
