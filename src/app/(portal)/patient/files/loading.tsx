import { Container, Group, SimpleGrid, Skeleton, Stack } from "@mantine/core";

export default function FilesLoading() {
    return (
        <Container pt="md">
            <Stack gap="lg">
                <Group justify="space-between">
                    <Group gap="sm">
                        <Skeleton circle h={32} w={32} />
                        <Stack gap={4}>
                            <Skeleton height={16} width={80} />
                            <Skeleton height={10} width={220} />
                        </Stack>
                    </Group>
                    <Skeleton height={22} width={64} radius="xl" />
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                    {["a", "b", "c", "d", "e", "f"].map((k) => (
                        <Skeleton key={k} height={240} radius="md" />
                    ))}
                </SimpleGrid>
            </Stack>
        </Container>
    );
}
