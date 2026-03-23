import { Container, Divider, Group, Skeleton, Stack } from "@mantine/core";

export default function HistoryLoading() {
    return (
        <Container pt="md">
            <Stack gap="lg">
                {/* Page header */}
                <Group justify="space-between">
                    <Group gap="sm">
                        <Skeleton circle h={32} w={32} />
                        <Stack gap={4}>
                            <Skeleton height={16} width={120} />
                            <Skeleton height={10} width={180} />
                        </Stack>
                    </Group>
                    <Skeleton height={22} width={64} radius="xl" />
                </Group>

                {/* Search bar */}
                <Skeleton height={36} radius="md" />

                {/* Filter row */}
                <Group gap="xs">
                    <Skeleton height={28} width={48} radius="md" />
                    <Skeleton height={28} width={64} radius="md" />
                    <Skeleton height={28} width={72} radius="md" />
                    <Skeleton height={28} width={64} radius="md" />
                    <Skeleton height={28} width={80} radius="md" />
                </Group>

                <Divider />

                {/* Session groups */}
                {[40, 64, 56].map((w) => (
                    <Stack key={w} gap={6}>
                        <Skeleton height={8} width={w} />
                        <Skeleton height={48} radius="md" />
                        <Skeleton height={48} radius="md" />
                        <Skeleton height={48} radius="md" />
                    </Stack>
                ))}
            </Stack>
        </Container>
    );
}
