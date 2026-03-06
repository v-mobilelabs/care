import { Box, Group, SimpleGrid, Skeleton, Stack } from "@mantine/core";

// ── Doctor card skeleton ──────────────────────────────────────────────────────

function DoctorCardSkeleton() {
    return (
        <Box
            style={{
                padding: "16px",
                borderRadius: 12,
                border: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
            }}
        >
            <Stack gap="sm">
                <Group justify="space-between" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                        <Skeleton circle h={38} w={38} style={{ flexShrink: 0 }} />
                        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                            <Skeleton height={12} width="50%" />
                            <Skeleton height={10} width="70%" />
                        </Stack>
                    </Group>
                    <Skeleton height={20} width={64} radius="xl" />
                </Group>
                <Skeleton height={10} width="90%" />
                <Skeleton height={10} width="70%" />
                <Skeleton height={32} radius="md" />
            </Stack>
        </Box>
    );
}

// ── Connect page loading skeleton ─────────────────────────────────────────────

export default function ConnectLoading() {
    return (
        <Box style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            {/* Header skeleton */}
            <Box
                px={{ base: "md", sm: "xl" }}
                py="md"
                style={{
                    flexShrink: 0,
                    borderBottom: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                }}
            >
                <Group justify="space-between">
                    <Group gap="sm">
                        <Skeleton circle h={36} w={36} />
                        <Stack gap={4}>
                            <Skeleton height={14} width={160} />
                            <Skeleton height={10} width={120} />
                        </Stack>
                    </Group>
                    <Skeleton height={32} width={80} radius="md" />
                </Group>
            </Box>

            {/* Content skeleton */}
            <Box px={{ base: "md", sm: "xl" }} py="lg" maw={800} mx="auto" style={{ width: "100%" }}>
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                    <DoctorCardSkeleton />
                    <DoctorCardSkeleton />
                    <DoctorCardSkeleton />
                </SimpleGrid>
            </Box>
        </Box>
    );
}
