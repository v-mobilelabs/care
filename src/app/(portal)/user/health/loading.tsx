import { Container, SimpleGrid, Skeleton, Stack } from "@mantine/core";

export default function HealthLoading() {
    return (
        <Container size="xl" pt="md">
            <Stack gap="xl">
                {/* KPI strip skeleton */}
                <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} height={68} radius="xl" />
                    ))}
                </SimpleGrid>

                {/* Title */}
                <Skeleton height={20} width={160} radius="sm" />

                {/* Card grid skeleton */}
                <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }} spacing="md">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <Skeleton key={i} height={140} radius="lg" />
                    ))}
                </SimpleGrid>
            </Stack>
        </Container>
    );
}
