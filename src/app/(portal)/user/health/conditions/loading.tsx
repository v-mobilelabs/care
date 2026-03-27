import { Container, Group, Skeleton, Stack } from "@mantine/core";

export default function ConditionsLoading() {
    return (
        <Container pt="md">
            <Stack>
                <Group justify="space-between">
                    <Group gap="sm">
                        <Skeleton circle h={36} w={36} />
                        <Stack gap={4}>
                            <Skeleton height={16} width={120} />
                            <Skeleton height={10} width={80} />
                        </Stack>
                    </Group>
                    <Skeleton height={30} width={30} radius="md" />
                </Group>
                <Skeleton height={36} radius="md" />
                <Skeleton height={28} width={340} radius="md" />
                <Stack gap="sm">
                    <Skeleton height={70} radius="md" />
                    <Skeleton height={70} radius="md" />
                    <Skeleton height={70} radius="md" />
                    <Skeleton height={70} radius="md" />
                    <Skeleton height={70} radius="md" />
                </Stack>
            </Stack>
        </Container>
    );
}
