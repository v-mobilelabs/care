import { Box, Group, Skeleton, Stack } from "@mantine/core";

// iOS-style grouped list skeleton matching DoctorEncountersContent layout

function EncounterRowSkeleton({ isLast }: Readonly<{ isLast?: boolean }>) {
    return (
        <Box
            style={{
                padding: "12px 16px",
                borderBottom: isLast
                    ? undefined
                    : "1px solid light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-5))",
            }}
        >
            <Group justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap">
                    <Skeleton circle h={40} w={40} style={{ flexShrink: 0 }} />
                    <Stack gap={4}>
                        <Skeleton height={12} width={140} />
                        <Group gap={8}>
                            <Skeleton height={9} width={80} />
                            <Skeleton height={9} width={60} />
                        </Group>
                    </Stack>
                </Group>
                <Group gap={8}>
                    <Skeleton height={22} width={72} radius="xl" />
                    <Skeleton circle h={16} w={16} />
                </Group>
            </Group>
        </Box>
    );
}

export default function EncountersLoading() {
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
            {/* iOS large title header */}
            <Box px={{ base: "md", sm: "xl" }} pt="xl" pb="md" style={{ flexShrink: 0 }}>
                <Skeleton height={34} width={200} radius="md" mb={8} />
                <Skeleton height={10} width={160} radius="md" />
            </Box>

            {/* iOS grouped card */}
            <Box px={{ base: "md", sm: "xl" }} style={{ flex: 1, overflow: "auto" }}>
                <Box
                    style={{
                        borderRadius: 16,
                        overflow: "hidden",
                        border: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                        background: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))",
                    }}
                >
                    <EncounterRowSkeleton />
                    <EncounterRowSkeleton />
                    <EncounterRowSkeleton />
                    <EncounterRowSkeleton />
                    <EncounterRowSkeleton isLast />
                </Box>
            </Box>
        </Box>
    );
}
