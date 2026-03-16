"use client";

import { Container, Stack, Text, Title } from "@mantine/core";
import { usePatientQuery } from "@/app/(portal)/patient/_query";
import { DetailsForm } from "./_form";
import type { DetailsFormValues } from "./_form";



// ── Page content ─────────────────────────────────────────────────────────────

export function DetailsContent() {
    const { data: patient } = usePatientQuery();

    const initialValues: DetailsFormValues = {
        height: patient?.height ?? 0,
        weight: patient?.weight ?? 0,
        bloodGroup: patient?.bloodGroup ?? "",
        foodPreferences: patient?.foodPreferences ?? [],
        activityLevel: patient?.activityLevel ?? "",
        sex: patient?.sex ?? "",
    };

    return (
        <Container pt="md" pb="xl" maw={640}>
            <Stack gap="lg">
                <Stack gap={4}>
                    <Title order={3}>Health details</Title>
                    <Text c="dimmed" size="sm">
                        These details help personalise your health insights and recommendations.
                    </Text>
                </Stack>
                <DetailsForm key={patient?.userId ?? ""} initialValues={initialValues} />
            </Stack>
        </Container>
    );
}
