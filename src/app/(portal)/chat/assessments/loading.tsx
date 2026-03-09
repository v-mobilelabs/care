import { Box, Group, ScrollArea, Skeleton, Stack } from "@mantine/core";

function AssessmentCardSkeleton() {
    return (
        <Box
            style={{
                padding: "16px",
                borderRadius: 12,
                border: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
            }}
        >
            <Group justify="space-between" mb={8}>
                <Group gap="sm">
                    <Skeleton circle h={36} w={36} />
                    <Box>
                        <Skeleton height={12} width={160} mb={6} />
                        <Skeleton height={8} width={100} />
                    </Box>
                </Group>
                <Skeleton height={24} width={60} radius="xl" />
            </Group>
            <Skeleton height={8} width="90%" mb={4} />
            <Skeleton height={8} width="70%" />
        </Box>
    );
}

export default function AssessmentsLoading() {
    return (
        <ScrollArea style={{ flex: 1 }} styles={{ viewport: { height: "100%" } }}>
            <Stack gap="md" maw={720} mx="auto" px="xl" py="xl">
                {/* Page header */}
                <Group justify="space-between">
                    <Group gap="sm">
                        <Skeleton circle h={36} w={36} />
                        <Box>
                            <Skeleton height={16} width={160} mb={6} />
                            <Skeleton height={10} width={240} />
                        </Box>
                    </Group>
                    <Skeleton height={24} width={80} radius="xl" />
                </Group>

                {/* Cards */}
                <AssessmentCardSkeleton />
                <AssessmentCardSkeleton />
                <AssessmentCardSkeleton />
            </Stack>
        </ScrollArea>
    );
}
