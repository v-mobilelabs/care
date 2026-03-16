import { Box, Card, Group, ScrollArea, SimpleGrid, Skeleton, Stack } from "@mantine/core";
import { UsageCardSkeleton } from "./_shared";

export default function UsageLoading() {
    return (
        <ScrollArea style={{ flex: 1 }} styles={{ viewport: { height: "100%" } }}>
            <Box px={{ base: "md", sm: "xl" }} py="lg" maw={900} mx="auto">
                <Card radius="xl" withBorder>
                    {/* Page header skeleton */}
                    <Card.Section bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))" px="md" py="md" withBorder>
                        <Group gap="sm">
                            <Skeleton circle h={36} w={36} />
                            <Stack gap={4}>
                                <Skeleton height={16} width={80} />
                                <Skeleton height={10} width={200} />
                            </Stack>
                        </Group>
                    </Card.Section>

                    {/* Card grid skeleton */}
                    <Card.Section p="md">
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                            <UsageCardSkeleton />
                            <UsageCardSkeleton />
                            <UsageCardSkeleton />
                            <UsageCardSkeleton />
                        </SimpleGrid>
                    </Card.Section>
                </Card>
            </Box>
        </ScrollArea>
    );
}
