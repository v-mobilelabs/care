import { Box, Grid, SimpleGrid, Skeleton, Stack } from "@mantine/core";

export default function DoctorDashboardLoading() {
    return (
        <Stack gap="xl">
            {/* Greeting skeleton */}
            <Box>
                <Skeleton height={32} width={280} radius="sm" mb={8} />
                <Skeleton height={14} width={200} radius="sm" />
            </Box>

            <Grid gutter="lg">
                {/* Patients queue skeleton */}
                <Grid.Col span={{ base: 12, md: 6, lg: 5 }}>
                    <Box
                        p="lg"
                        style={{
                            borderRadius: 16,
                            border: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                            background: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))",
                        }}
                    >
                        <Skeleton height={20} width={160} mb="md" />
                        <Stack gap="sm">
                            {["a", "b", "c"].map((k) => (
                                <Skeleton key={k} height={56} radius="md" />
                            ))}
                        </Stack>
                    </Box>
                </Grid.Col>

                {/* Stat cards skeleton */}
                <Grid.Col span={{ base: 12, md: 6, lg: 7 }}>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                        {["x", "y"].map((k) => (
                            <Box
                                key={k}
                                p="lg"
                                style={{
                                    borderRadius: 16,
                                    border: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                                    background: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))",
                                }}
                            >
                                <Skeleton height={11} width={100} mb={8} />
                                <Skeleton height={28} width={48} mb={6} />
                                <Skeleton height={11} width={120} />
                            </Box>
                        ))}
                    </SimpleGrid>
                </Grid.Col>
            </Grid>
        </Stack>
    );
}
