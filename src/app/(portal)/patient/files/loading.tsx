import { Box, Group, ScrollArea, SimpleGrid, Skeleton, Stack } from "@mantine/core";

// ── File card skeleton ────────────────────────────────────────────────────────

function FileCardSkeleton() {
    return (
        <Box
            style={{
                padding: 16,
                borderRadius: 12,
                border: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
            }}
        >
            <Skeleton height={130} radius="md" mb={16} />
            <Skeleton height={12} width="80%" mb={8} />
            <Group gap={6} mb={8}>
                <Skeleton height={20} width={64} radius="xl" />
                <Skeleton height={20} width={48} radius="xl" />
            </Group>
            <Skeleton height={8} width={100} mb={16} />
            <Group justify="flex-end" gap={4}>
                <Skeleton circle h={32} w={32} />
                <Skeleton circle h={32} w={32} />
                <Skeleton circle h={32} w={32} />
                <Skeleton circle h={32} w={32} />
            </Group>
        </Box>
    );
}

// ── Files page loading skeleton ───────────────────────────────────────────────

export default function FilesLoading() {
    return (
        <ScrollArea style={{ flex: 1 }} styles={{ viewport: { height: "100%" } }}>
            <Stack gap="lg" maw={960} mx="auto" px="xl" py="xl">
                {/* Page header */}
                <Group justify="space-between">
                    <Group gap="sm">
                        <Skeleton circle h={32} w={32} />
                        <Box>
                            <Skeleton height={14} width={80} mb={6} />
                            <Skeleton height={8} width={220} />
                        </Box>
                    </Group>
                    <Skeleton height={22} width={64} radius="xl" />
                </Group>

                {/* File grid */}
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                    {["a", "b", "c", "d", "e", "f"].map((k) => (
                        <FileCardSkeleton key={k} />
                    ))}
                </SimpleGrid>
            </Stack>
        </ScrollArea>
    );
}
