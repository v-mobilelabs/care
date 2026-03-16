import { Box, Group, ScrollArea, Skeleton, Stack } from "@mantine/core";

function CallCardSkeleton() {
    return (
        <Box
            style={{
                padding: "14px 16px",
                borderRadius: 12,
                border: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
            }}
        >
            <Group justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap">
                    <Skeleton circle h={40} w={40} style={{ flexShrink: 0 }} />
                    <Stack gap={4}>
                        <Skeleton height={12} width={140} />
                        <Skeleton height={9} width={100} />
                    </Stack>
                </Group>
                <Group gap={8}>
                    <Skeleton height={22} width={72} radius="xl" />
                    <Skeleton circle h={28} w={28} />
                </Group>
            </Group>
        </Box>
    );
}

export default function CallsLoading() {
    return (
        <Box style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            {/* Header */}
            <Box
                px={{ base: "md", sm: "xl" }}
                py="md"
                style={{
                    flexShrink: 0,
                    borderBottom: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                }}
            >
                <Group gap="sm">
                    <Skeleton circle h={36} w={36} />
                    <Box>
                        <Skeleton height={14} width={120} mb={6} />
                        <Skeleton height={9} width={180} />
                    </Box>
                </Group>
            </Box>

            <ScrollArea style={{ flex: 1 }} styles={{ viewport: { height: "100%" } }}>
                <Stack gap="sm" px={{ base: "md", sm: "xl" }} py="lg">
                    <CallCardSkeleton />
                    <CallCardSkeleton />
                    <CallCardSkeleton />
                    <CallCardSkeleton />
                    <CallCardSkeleton />
                </Stack>
            </ScrollArea>
        </Box>
    );
}
