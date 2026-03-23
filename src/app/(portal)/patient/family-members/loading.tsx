import { Container, Group, SimpleGrid, Skeleton, Stack } from "@mantine/core";

export default function FamilyMembersLoading() {
    return (
        <Container pt="md">
            <Stack>
                <Group justify="space-between" align="center">
                    <Group gap="sm">
                        <Skeleton circle h={36} w={36} />
                        <Stack gap={4}>
                            <Skeleton height={16} width={120} />
                            <Skeleton height={10} width={100} />
                        </Stack>
                    </Group>
                    <Skeleton height={36} width={120} radius="md" />
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    {["a", "b", "c"].map((k) => <Skeleton key={k} height={148} radius="lg" />)}
                </SimpleGrid>
            </Stack>
        </Container>
    );
}
