import { Box, Group, Skeleton, Stack } from "@mantine/core";

// Skeleton for the EncounterDetailContent — patient card + notes section

export default function EncounterDetailLoading() {
    return (
        <Box
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                overflow: "auto",
                background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))",
            }}
        >
            {/* iOS large title header */}
            <Box px={{ base: "md", sm: "xl" }} pt="xl" pb="md" style={{ flexShrink: 0 }}>
                <Skeleton height={34} width={220} radius="md" mb={8} />
                <Skeleton height={10} width={140} radius="md" />
            </Box>

            <Stack gap="md" px={{ base: "md", sm: "xl" }} pb="xl">
                {/* Patient info card */}
                <Box
                    p="lg"
                    style={{
                        borderRadius: 16,
                        border: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                        background: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))",
                    }}
                >
                    <Group gap="md" wrap="nowrap" mb="md">
                        <Skeleton circle h={48} w={48} style={{ flexShrink: 0 }} />
                        <Stack gap={6} style={{ flex: 1 }}>
                            <Skeleton height={14} width={180} />
                            <Skeleton height={10} width={120} />
                        </Stack>
                        <Skeleton height={24} width={80} radius="xl" />
                    </Group>
                    <Group gap="lg">
                        <Stack gap={4}>
                            <Skeleton height={9} width={60} />
                            <Skeleton height={12} width={120} />
                        </Stack>
                        <Stack gap={4}>
                            <Skeleton height={9} width={60} />
                            <Skeleton height={12} width={80} />
                        </Stack>
                    </Group>
                </Box>

                {/* Notes card */}
                <Box
                    p="lg"
                    style={{
                        borderRadius: 16,
                        border: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                        background: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))",
                    }}
                >
                    <Group justify="space-between" mb="md">
                        <Skeleton height={13} width={120} />
                        <Skeleton height={32} width={100} radius="md" />
                    </Group>
                    <Skeleton height={140} radius="md" />
                </Box>
            </Stack>
        </Box>
    );
}
