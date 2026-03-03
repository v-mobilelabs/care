import { Box, Group, Skeleton, Stack } from "@mantine/core";

export default function DietPlansLoading() {
    return (
        <Box style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {/* Header skeleton */}
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
                    <Stack gap={4}>
                        <Skeleton height={14} width={120} />
                        <Skeleton height={10} width={180} />
                    </Stack>
                </Group>
            </Box>

            {/* Cards skeleton */}
            <Box px={{ base: "md", sm: "xl" }} py="lg" maw={800} mx="auto" style={{ width: "100%" }}>
                <Stack gap="sm">
                    {["sk-a", "sk-b"].map((k) => (
                        <Skeleton key={k} height={110} radius="lg" />
                    ))}
                </Stack>
            </Box>
        </Box>
    );
}
