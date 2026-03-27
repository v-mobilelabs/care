import { Container, Group, Skeleton, Stack } from "@mantine/core";

export default function DietPlansLoading() {
    return (
        <Container pt="md">
            <Stack>
                <Group gap="sm">
                    <Skeleton circle h={36} w={36} />
                    <Stack gap={4}>
                        <Skeleton height={16} width={120} />
                        <Skeleton height={10} width={180} />
                    </Stack>
                </Group>
                <Stack gap="sm">
                    <Skeleton height={110} radius="lg" />
                    <Skeleton height={110} radius="lg" />
                </Stack>
            </Stack>
        </Container>
    );
}
