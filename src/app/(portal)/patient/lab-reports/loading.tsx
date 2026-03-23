import { Container, Group, Skeleton, Stack } from "@mantine/core";

function CardSkeleton() {
    return (
        <Skeleton height={80} radius="md" />
    );
}

export default function LabReportsLoading() {
    return (
        <Container pt="md">
            <Stack>
                <Group gap="sm">
                    <Skeleton circle h={36} w={36} />
                    <Stack gap={4}>
                        <Skeleton height={16} width={120} />
                        <Skeleton height={10} width={200} />
                    </Stack>
                </Group>
                <Stack gap="md">
                    <CardSkeleton />
                    <CardSkeleton />
                    <CardSkeleton />
                </Stack>
            </Stack>
        </Container>
    );
}
