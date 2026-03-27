import { Container, Card, Group, SimpleGrid, Skeleton, Stack } from "@mantine/core";
import { UsageCardSkeleton } from "./_shared";

export default function UsageLoading() {
    return (
        <Container pt="md">
            <Card radius="xl" withBorder>
                <Card.Section bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))" px="md" py="md" withBorder>
                    <Group gap="sm">
                        <Skeleton circle h={36} w={36} />
                        <Stack gap={4}>
                            <Skeleton height={16} width={80} />
                            <Skeleton height={10} width={200} />
                        </Stack>
                    </Group>
                </Card.Section>
                <Card.Section p="md">
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                        <UsageCardSkeleton />
                        <UsageCardSkeleton />
                        <UsageCardSkeleton />
                        <UsageCardSkeleton />
                    </SimpleGrid>
                </Card.Section>
            </Card>
        </Container>
    );
}
