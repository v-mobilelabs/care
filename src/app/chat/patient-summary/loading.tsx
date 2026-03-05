import { Box, Group, ScrollArea, Skeleton, Stack } from "@mantine/core";

export default function PatientSummaryLoading() {
    return (
        <ScrollArea style={{ flex: 1 }}>
            <Box p="md" style={{ maxWidth: 760, margin: "0 auto" }}>
                <Group gap="sm" mb="lg">
                    <Skeleton circle h={40} w={40} />
                    <Box>
                        <Skeleton height={14} width={180} mb={6} />
                        <Skeleton height={10} width={260} />
                    </Box>
                </Group>
                <Skeleton height={68} radius="lg" mb="lg" />
                <Stack gap="sm">
                    {["sk-a", "sk-b", "sk-c"].map((k) => (
                        <Box
                            key={k}
                            style={{
                                padding: "16px",
                                borderRadius: 12,
                                border: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                            }}
                        >
                            <Group justify="space-between" mb={8}>
                                <Group gap="sm">
                                    <Skeleton circle h={32} w={32} />
                                    <Box>
                                        <Skeleton height={12} width={200} mb={6} />
                                        <Skeleton height={8} width={80} />
                                    </Box>
                                </Group>
                                <Skeleton h={24} w={24} radius="sm" />
                            </Group>
                            <Skeleton height={8} width="95%" mb={4} />
                            <Skeleton height={8} width="85%" mb={4} />
                            <Skeleton height={8} width="60%" />
                        </Box>
                    ))}
                </Stack>
            </Box>
        </ScrollArea>
    );
}
