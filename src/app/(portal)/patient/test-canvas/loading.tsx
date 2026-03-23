import { Box, Divider, Group, SimpleGrid, Skeleton, Stack } from "@mantine/core";

function StatSkeleton() {
    return (
        <Skeleton height={68} radius="lg" />
    );
}

function SessionSkeleton() {
    return (
        <Box
            style={{
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
            }}
        >
            <Group justify="space-between" mb={8}>
                <Group gap="sm" style={{ flex: 1 }}>
                    <Skeleton circle height={30} width={30} />
                    <Skeleton height={12} width="50%" />
                </Group>
                <Skeleton height={10} width={48} />
            </Group>
            <Skeleton height={8} width="75%" ml={38} mb={8} />
            <Group gap={6} ml={38}>
                <Skeleton height={16} width={60} radius="sm" />
                <Skeleton height={16} width={40} radius="sm" />
            </Group>
        </Box>
    );
}

function GroupSkeleton({ labelWidth, count }: Readonly<{ labelWidth: number; count: number }>) {
    return (
        <Box>
            <Group gap="xs" mb="xs">
                <Skeleton height={8} width={labelWidth} />
                <Divider style={{ flex: 1 }} />
            </Group>
            <Stack gap="sm">
                {Array.from({ length: count }, (_, i) => (
                    <SessionSkeleton key={i} />
                ))}
            </Stack>
        </Box>
    );
}

export default function HistoriesLoading() {
    return (
        <Stack gap="md" maw={1100} mx="auto" px="md" pt="md" pb="xl">
            {/* Header */}
            <Group gap="sm">
                <Skeleton circle height={42} width={42} />
                <Box>
                    <Skeleton height={16} width={100} mb={6} />
                    <Skeleton height={10} width={220} />
                </Box>
            </Group>

            {/* Stats */}
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
            </SimpleGrid>

            {/* Search bar */}
            <Skeleton height={48} radius="xl" />

            {/* Grouped sessions */}
            <GroupSkeleton labelWidth={40} count={2} />
            <GroupSkeleton labelWidth={64} count={2} />
            <GroupSkeleton labelWidth={72} count={3} />
        </Stack>
    );
}
