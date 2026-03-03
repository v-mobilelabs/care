import { Box, Group, Skeleton, Stack } from "@mantine/core";

function CardSkeleton() {
    return (
        <Box
            style={{
                padding: "14px 16px",
                borderRadius: 10,
                border: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
            }}
        >
            <Group gap="sm">
                <Skeleton circle h={36} w={36} />
                <Stack gap={6} style={{ flex: 1 }}>
                    <Skeleton height={12} width="40%" />
                    <Group gap={6}>
                        <Skeleton height={18} width={60} radius="xl" />
                        <Skeleton height={10} width={80} />
                    </Group>
                </Stack>
            </Group>
        </Box>
    );
}

export default function MedicationsLoading() {
    return (
        <Box style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
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
                            <Skeleton height={14} width={140} />
                            <Skeleton height={10} width={100} />
                        </Stack>
                    </Group>
                    <Skeleton height={32} width={80} radius="md" />
                </Group>
            </Box>

            {/* Content skeleton */}
            <Box px={{ base: "md", sm: "xl" }} py="lg" maw={800} mx="auto" style={{ width: "100%" }}>
                <Skeleton height={10} width={60} mb="sm" />
                <Stack gap="sm">
                    <CardSkeleton />
                    <CardSkeleton />
                    <CardSkeleton />
                </Stack>
            </Box>
        </Box>
    );
}
