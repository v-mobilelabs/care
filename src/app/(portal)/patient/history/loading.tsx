import { Box, Divider, Group, ScrollArea, Skeleton, Stack } from "@mantine/core";

// ── History page loading skeleton ─────────────────────────────────────────────

function SessionCardSkeleton() {
    return (
        <Box
            style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
            }}
        >
            <Group justify="space-between" mb={6}>
                <Skeleton height={10} width="55%" />
                <Skeleton height={8} width={48} />
            </Group>
            <Skeleton height={8} width="80%" />
        </Box>
    );
}

function GroupSkeleton({ labelWidth }: Readonly<{ labelWidth: number }>) {
    return (
        <Stack gap={6}>
            <Skeleton height={8} width={labelWidth} />
            <SessionCardSkeleton />
            <SessionCardSkeleton />
            <SessionCardSkeleton />
        </Stack>
    );
}

export default function HistoryLoading() {
    return (
        <ScrollArea style={{ flex: 1 }} styles={{ viewport: { height: "100%" } }}>
            <Stack gap="lg" maw={720} mx="auto" px="xl" py="xl">
                {/* Page header */}
                <Group justify="space-between">
                    <Group gap="sm">
                        <Skeleton circle h={32} w={32} />
                        <Box>
                            <Skeleton height={14} width={120} mb={6} />
                            <Skeleton height={8} width={180} />
                        </Box>
                    </Group>
                    <Skeleton height={22} width={64} radius="xl" />
                </Group>

                {/* Search bar */}
                <Skeleton height={36} radius="md" />

                <Divider />

                {/* Session groups */}
                <GroupSkeleton labelWidth={40} />
                <GroupSkeleton labelWidth={64} />
                <GroupSkeleton labelWidth={56} />
            </Stack>
        </ScrollArea>
    );
}
