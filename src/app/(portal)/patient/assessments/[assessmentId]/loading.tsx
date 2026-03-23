import { Container, Group, Skeleton, Stack } from "@mantine/core";

export default function LoadingAssessmentDetail() {
    return (
        <Container pt="md" pb="xl" size="md">
            <Stack gap="md">
                <Group gap="sm" align="center">
                    <Skeleton circle h={32} w={32} />
                    <Stack gap={4}>
                        <Skeleton h={16} w={220} />
                        <Skeleton h={10} w={160} />
                    </Stack>
                </Group>
                <Skeleton h={220} radius="lg" />
                <Skeleton h={120} radius="lg" />
                <Skeleton h={180} radius="lg" />
            </Stack>
        </Container>
    );
}
