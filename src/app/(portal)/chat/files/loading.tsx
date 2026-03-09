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
            <Group justify="space-between" mb={12}>
                <Skeleton circle h={40} w={40} />
                <Skeleton circle h={22} w={22} />
            </Group>
            <Skeleton height={10} width="80%" mb={6} />
            <Skeleton height={8} width={64} mb={12} />
            <Group justify="space-between">
                <Skeleton height={8} width={48} />
                <Skeleton height={22} width={50} radius="xl" />
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
