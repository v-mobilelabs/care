import { Box, Skeleton, Stack } from "@mantine/core";

export default function InsuranceLoading() {
    return (
        <Box p="md" style={{ maxWidth: 840, margin: "0 auto" }}>
            <Skeleton height={32} width={200} mb={8} radius="md" />
            <Skeleton height={16} width={360} mb={32} radius="md" />
            <Stack gap="md">
                {["sk-a", "sk-b", "sk-c"].map((k) => (
                    <Skeleton key={k} height={200} radius="lg" />
                ))}
            </Stack>
        </Box>
    );
}
