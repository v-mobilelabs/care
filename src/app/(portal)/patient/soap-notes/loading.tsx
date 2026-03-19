import { Box, Group, Skeleton, Stack } from "@mantine/core";

export default function SoapNotesLoading() {
    return (
        <Box>
            {/* Tabs skeleton */}
            <Group gap="md" mb="md">
                <Skeleton height={36} width={120} radius="md" />
                <Skeleton height={36} width={120} radius="md" />
            </Group>
            {/* Content skeleton */}
            <Stack gap="sm">
                {["a", "b", "c"].map((k) => (
                    <Skeleton key={k} height={56} radius="md" />
                ))}
            </Stack>
        </Box>
    );
}
