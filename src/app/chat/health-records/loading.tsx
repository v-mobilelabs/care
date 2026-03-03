import { Box, Divider, Group, ScrollArea, Skeleton, Stack } from "@mantine/core";

// ── Record card skeleton ──────────────────────────────────────────────────────

function RecordCardSkeleton() {
    return (
        <Box
            style={{
                padding: "14px 16px",
                borderRadius: 10,
                border: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
            }}
        >
            <Group justify="space-between" mb={8}>
                <Group gap="sm">
                    <Skeleton circle h={28} w={28} />
                    <Skeleton height={10} width={160} />
                </Group>
                <Group gap={6}>
                    <Skeleton height={22} width={64} radius="xl" />
                    <Skeleton circle h={22} w={22} />
                </Group>
            </Group>
            <Skeleton height={8} width="60%" ml={44} />
        </Box>
    );
}

// ── Health records page loading skeleton ──────────────────────────────────────

export default function HealthRecordsLoading() {
    return (
        <ScrollArea style={{ flex: 1 }} styles={{ viewport: { height: "100%" } }}>
            <Stack gap="lg" maw={800} mx="auto" px="xl" py="xl">
                {/* Page header */}
                <Group gap="sm">
                    <Skeleton circle h={32} w={32} />
                    <Box>
                        <Skeleton height={14} width={130} mb={6} />
                        <Skeleton height={8} width={260} />
                    </Box>
                </Group>

                {/* Tabs */}
                <Group gap={0} style={{ borderBottom: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))" }}>
                    <Skeleton height={32} width={120} radius={0} mr={4} />
                    <Skeleton height={32} width={120} radius={0} />
                </Group>

                <Divider />

                {/* Record list */}
                <Stack gap="sm">
                    {["a", "b", "c", "d"].map((k) => (
                        <RecordCardSkeleton key={k} />
                    ))}
                </Stack>
            </Stack>
        </ScrollArea>
    );
}
