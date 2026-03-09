import { Box, Group, SimpleGrid, Skeleton, Stack } from "@mantine/core";

// ── iOS-style doctor card skeleton ────────────────────────────────────────────

function DoctorCardSkeleton() {
    return (
        <Box
            style={{
                padding: 16,
                borderRadius: 16,
                background: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))",
                border: "1px solid light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-5))",
            }}
        >
            <Stack gap="sm">
                <Group gap="sm" wrap="nowrap">
                    <Skeleton circle h={44} w={44} style={{ flexShrink: 0 }} />
                    <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                        <Skeleton height={13} width="55%" radius="xl" />
                        <Skeleton height={10} width="40%" radius="xl" />
                    </Stack>
                    <Skeleton height={22} width={72} radius="xl" />
                </Group>
                <Skeleton height={9} width="80%" radius="xl" />
                <Skeleton height={40} radius={12} />
            </Stack>
        </Box>
    );
}

// ── Connect page loading skeleton (iOS-style) ────────────────────────────────

export default function ConnectLoading() {
    return (
        <Box
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                overflow: "hidden",
                background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))",
            }}
        >
            {/* Header skeleton — frosted glass bar */}
            <Box
                px={{ base: "md", sm: "xl" }}
                py="sm"
                style={{
                    flexShrink: 0,
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    background: "light-dark(rgba(255,255,255,0.72), rgba(30,30,30,0.72))",
                    borderBottom: "0.5px solid light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.06))",
                }}
            >
                <Stack gap={4} align="center">
                    <Skeleton height={14} width={180} radius="xl" />
                    <Skeleton height={10} width={120} radius="xl" />
                </Stack>
            </Box>

            {/* Content skeleton */}
            <Box px={{ base: "md", sm: "xl" }} py="lg" maw={560} mx="auto" style={{ width: "100%" }}>
                <Stack gap="md">
                    {/* Status banner skeleton */}
                    <Skeleton height={48} radius={14} />

                    {/* Doctor cards */}
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                        <DoctorCardSkeleton />
                        <DoctorCardSkeleton />
                        <DoctorCardSkeleton />
                    </SimpleGrid>
                </Stack>
            </Box>
        </Box>
    );
}
