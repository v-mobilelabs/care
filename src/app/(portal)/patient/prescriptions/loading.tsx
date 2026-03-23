import { Container, Group, SimpleGrid, Skeleton, Stack } from "@mantine/core";

export default function PrescriptionsLoading() {
    return (
        <Container pt="md">
            <Stack>
                {/* Header skeleton */}
                <Group justify="space-between">
                    <Group gap="sm">
                        <Skeleton circle h={36} w={36} />
                        <Stack gap={4}>
                            <Skeleton height={16} width={140} />
                            <Skeleton height={10} width={200} />
                        </Stack>
                    </Group>
                    <Group gap="xs">
                        <Skeleton height={32} width={100} radius="md" />
                        <Skeleton height={32} width={80} radius="md" />
                    </Group>
                </Group>
                <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, lg: 4 }} spacing="md">
                    {["a", "b", "c", "d"].map((k) => (
                        <Skeleton key={k} height={180} radius="md" />
                    ))}
                </SimpleGrid>
            </Stack>
        </Container>
    );
}
