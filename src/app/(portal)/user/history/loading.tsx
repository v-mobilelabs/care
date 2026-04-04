import { MotionCard } from "@/ui/components/motion-card";
import { Box, Container, Divider, Group, ScrollArea, Skeleton, Stack } from "@mantine/core";

export default function HistoryLoading() {
    return (
        <Container pt="md">
            <Stack>
                {/* Page header */}
                <Group justify="space-between" align="center">
                    <Group gap="sm">
                        <Skeleton h={36} w={36} radius="md" />
                        <Stack gap={4}>
                            <Skeleton height={16} width={132} />
                            <Skeleton height={10} width={280} />
                        </Stack>
                    </Group>
                </Group>

                {/* Legend card */}
                <MotionCard interactive blobColor="var(--mantine-color-primary-6)" withBorder radius="lg" p="md">
                    <Stack gap="sm">
                        <Stack gap={4}>
                            <Skeleton height={14} width={140} />
                            <Skeleton height={10} width="100%" />
                            <Skeleton height={10} width="90%" />
                        </Stack>
                        <Group gap="xs" wrap="wrap">
                            <Skeleton height={22} width={156} radius="sm" />
                            <Skeleton height={22} width={156} radius="sm" />
                            <Skeleton height={22} width={176} radius="sm" />
                        </Group>
                        <Skeleton height={10} width="85%" />
                    </Stack>
                </MotionCard>

                {/* Search + filter controls */}
                <Stack gap="sm">
                    <Skeleton height={36} radius="md" />
                    <ScrollArea type="never">
                        <Group gap="xs" wrap="nowrap">
                            <Skeleton height={28} width={52} radius="md" />
                            <Skeleton height={28} width={84} radius="md" />
                            <Skeleton height={28} width={92} radius="md" />
                            <Skeleton height={28} width={86} radius="md" />
                            <Skeleton height={28} width={92} radius="md" />
                            <Skeleton height={28} width={86} radius="md" />
                        </Group>
                    </ScrollArea>
                    <Skeleton height={28} width={170} radius="md" />
                </Stack>

                {/* Session results */}
                <Box>
                    <Stack gap="lg">
                        {[120, 96].map((w) => (
                            <Box key={w}>
                                <Group gap="xs" mb="sm">
                                    <Skeleton height={10} width={w} />
                                    <Divider style={{ flex: 1 }} />
                                </Group>
                                <Stack gap="sm">
                                    <Skeleton height={62} radius="md" />
                                    <Skeleton height={62} radius="md" />
                                    <Skeleton height={62} radius="md" />
                                </Stack>
                            </Box>
                        ))}
                    </Stack>
                </Box>
            </Stack>
        </Container>
    );
}
