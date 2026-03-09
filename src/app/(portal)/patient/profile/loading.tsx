import { Box, Divider, Group, Paper, ScrollArea, Skeleton, Stack } from "@mantine/core";

// ── Profile page loading skeleton ─────────────────────────────────────────────

export default function ProfileLoading() {
    return (
        <ScrollArea style={{ flex: 1 }} styles={{ viewport: { height: "100%" } }}>
            <Stack gap="xl" maw={640} mx="auto" px="xl" py="xl">
                {/* Page header */}
                <Group gap="sm">
                    <Skeleton circle h={32} w={32} />
                    <Box>
                        <Skeleton height={14} width={80} mb={6} />
                        <Skeleton height={8} width={200} />
                    </Box>
                </Group>

                {/* Avatar + display info */}
                <Paper withBorder radius="lg" p="xl">
                    <Group gap="lg" mb="lg">
                        <Skeleton circle h={72} w={72} />
                        <Stack gap={6}>
                            <Skeleton height={14} width={140} />
                            <Skeleton height={10} width={200} />
                        </Stack>
                    </Group>
                    <Divider mb="lg" />
                    <Stack gap="md">
                        <Group grow gap="md">
                            <Stack gap={6}>
                                <Skeleton height={8} width={70} />
                                <Skeleton height={36} radius="md" />
                            </Stack>
                            <Stack gap={6}>
                                <Skeleton height={8} width={70} />
                                <Skeleton height={36} radius="md" />
                            </Stack>
                        </Group>
                        <Skeleton height={36} width={120} radius="md" />
                    </Stack>
                </Paper>

                {/* Security section */}
                <Paper withBorder radius="lg" p="xl">
                    <Group gap="sm" mb="md">
                        <Skeleton circle h={28} w={28} />
                        <Skeleton height={12} width={100} />
                    </Group>
                    <Divider mb="md" />
                    <Stack gap={6} mb="md">
                        <Skeleton height={8} width={80} />
                        <Skeleton height={10} width="100%" />
                        <Skeleton height={8} width={64} />
                    </Stack>
                    <Skeleton height={36} width={140} radius="md" />
                </Paper>

                {/* Danger zone */}
                <Paper withBorder radius="lg" p="xl" style={{ borderColor: "var(--mantine-color-red-3)" }}>
                    <Group gap="sm" mb="md">
                        <Skeleton circle h={28} w={28} />
                        <Skeleton height={12} width={90} />
                    </Group>
                    <Divider mb="md" />
                    <Skeleton height={8} width="70%" mb={12} />
                    <Skeleton height={36} width={140} radius="md" />
                </Paper>
            </Stack>
        </ScrollArea>
    );
}
