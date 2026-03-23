import { SimpleGrid, Skeleton, Stack } from "@mantine/core";

export default function KnowledgeBaseLoading() {
    return (
        <Stack gap="md" p="md">
            {/* Header skeleton */}
            <Skeleton height={36} width={200} radius="md" />
            <Skeleton height={14} width={320} radius="sm" />

            {/* Filter bar skeleton */}
            <Skeleton height={36} radius="md" />

            {/* Card grid skeleton */}
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                {Array.from({ length: 6 }, (_, i) => (
                    <Skeleton key={i} height={160} radius="lg" />
                ))}
            </SimpleGrid>
        </Stack>
    );
}
