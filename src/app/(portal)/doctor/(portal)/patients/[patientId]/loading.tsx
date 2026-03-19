import { Box, Group, Skeleton, Stack, Tabs } from "@mantine/core";

export default function PatientDetailLoading() {
    return (
        <Stack gap="md" p="md">
            {/* Patient header skeleton */}
            <Group gap="md">
                <Skeleton circle h={56} w={56} />
                <Box>
                    <Skeleton height={16} width={180} mb={6} />
                    <Skeleton height={10} width={120} />
                </Box>
            </Group>
            {/* Tabs skeleton */}
            <Group gap="md">
                <Skeleton height={36} width={100} radius="md" />
                <Skeleton height={36} width={100} radius="md" />
                <Skeleton height={36} width={100} radius="md" />
            </Group>
            {/* Content cards skeleton */}
            <Stack gap="sm">
                {["a", "b", "c"].map((k) => (
                    <Skeleton key={k} height={80} radius="lg" />
                ))}
            </Stack>
        </Stack>
    );
}
