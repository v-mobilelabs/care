import { Container, Group, Skeleton, Stack } from "@mantine/core";

export default function AssessmentsLoading() {
    return (
        <Container pt="md">
            <Stack gap="md">
                <Group justify="space-between">
                    <Group gap="sm">
                        <Skeleton circle h={36} w={36} />
                        <Stack gap={4}>
                            <Skeleton height={16} width={160} />
                            <Skeleton height={10} width={240} />
                        </Stack>
                    </Group>
                    <Skeleton height={24} width={80} radius="xl" />
                </Group>
                <Skeleton height={80} radius="md" />
                <Skeleton height={80} radius="md" />
                <Skeleton height={80} radius="md" />
            </Stack>
        </Container>
    );
}
