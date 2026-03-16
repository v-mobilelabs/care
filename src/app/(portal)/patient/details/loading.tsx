import { Container, Paper, SimpleGrid, Skeleton, Stack } from "@mantine/core";

// ── Field skeleton ────────────────────────────────────────────────────────────

function FieldSkeleton() {
    return (
        <Stack gap={6}>
            <Skeleton height={12} width={100} radius="sm" />
            <Skeleton height={36} radius="md" />
        </Stack>
    );
}

// ── Patient details loading skeleton ─────────────────────────────────────────

export default function PatientDetailsLoading() {
    return (
        <Container pt="md" pb="xl" maw={640}>
            <Stack gap="lg">
                {/* Page heading */}
                <Stack gap={6}>
                    <Skeleton height={22} width={140} radius="sm" />
                    <Skeleton height={14} width={320} radius="sm" />
                </Stack>

                {/* Form card */}
                <Paper withBorder radius="lg" p="xl">
                    <Stack gap="md">
                        {/* Height + Weight */}
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                            <FieldSkeleton />
                            <FieldSkeleton />
                        </SimpleGrid>

                        {/* Sex + DOB */}
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                            <FieldSkeleton />
                            <FieldSkeleton />
                        </SimpleGrid>

                        {/* Blood group */}
                        <FieldSkeleton />

                        {/* Activity level */}
                        <FieldSkeleton />

                        {/* Food preferences */}
                        <FieldSkeleton />

                        {/* Save button */}
                        <Skeleton height={36} width={120} radius="md" ml="auto" />
                    </Stack>
                </Paper>
            </Stack>
        </Container>
    );
}
