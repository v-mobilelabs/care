import { Container, Group, Skeleton, Stack } from "@mantine/core";

export default function DoctorsLoading() {
    return (
        <Container pt="md">
            <Stack>
                <Group justify="space-between">
                    <Group gap="sm">
                        <Skeleton circle h={36} w={36} />
                        <Stack gap={4}>
                            <Skeleton height={16} width={140} />
                            <Skeleton height={10} width={100} />
                        </Stack>
                    </Group>
                    <Skeleton height={32} width={80} radius="md" />
                </Group>
                <Stack gap="md">
                    <Skeleton height={60} radius="md" />
                    <Skeleton height={60} radius="md" />
                    <Skeleton height={60} radius="md" />
                </Stack>
            </Stack>
        </Container>
    );
}
