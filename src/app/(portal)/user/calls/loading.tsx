import { Container, Group, Skeleton, Stack } from "@mantine/core";

export default function CallsLoading() {
    return (
        <Container pt="md">
            <Stack gap="md">
                <Group gap="sm">
                    <Skeleton circle h={36} w={36} />
                    <Stack gap={4}>
                        <Skeleton height={16} width={120} />
                        <Skeleton height={10} width={180} />
                    </Stack>
                </Group>
                <Stack gap="sm">
                    <Skeleton height={56} radius="md" />
                    <Skeleton height={56} radius="md" />
                    <Skeleton height={56} radius="md" />
                    <Skeleton height={56} radius="md" />
                </Stack>
            </Stack>
        </Container>
    );
}
