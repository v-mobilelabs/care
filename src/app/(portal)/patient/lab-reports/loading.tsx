import { Box, Group, Skeleton, Stack } from "@mantine/core";

function CardSkeleton() {
    return (
        <Box
            style={{
                padding: "14px 16px",
                borderRadius: 12,
                border: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
            }}
        >
            <Group gap="sm" mb={8}>
                <Skeleton circle h={28} w={28} />
                <Skeleton height={14} width="50%" />
            </Group>
            <Skeleton height={10} width={120} mb={8} />
            <Group gap={6}>
                <Skeleton height={18} width={80} radius="xl" />
                <Skeleton height={18} width={70} radius="xl" />
            </Group>
        </Box>
    );
}

export default function LabReportsLoading() {
    return (
        <Box px="xl" py="xl" maw={800} mx="auto">
            <Group gap="sm" mb="lg">
                <Skeleton circle h={36} w={36} />
                <Stack gap={4}>
                    <Skeleton height={16} width={120} />
                    <Skeleton height={10} width={200} />
                </Stack>
            </Group>
            <Stack gap="md">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
            </Stack>
        </Box>
    );
}
