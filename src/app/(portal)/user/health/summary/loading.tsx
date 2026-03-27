import { Container, Group, Skeleton, Stack } from "@mantine/core";

export default function PatientSummaryLoading() {
    return (
        <Container pt="md">
            <Stack gap="md">
                <Group justify="space-between">
                    <Group gap="sm">
                        <Skeleton circle h={36} w={36} />
                        <Stack gap={4}>
                            <Skeleton height={16} width={180} />
                            <Skeleton height={10} width={260} />
                        </Stack>
                    </Group>
                </Group>
                <Skeleton height={100} radius="md" />
                <Skeleton height={100} radius="md" />
                <Skeleton height={100} radius="md" />
            </Stack>
        </Container>
    );
}
