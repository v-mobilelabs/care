import { Container, Group, SimpleGrid, Skeleton, Stack } from "@mantine/core";

export function HealthLoadingContent() {
    return (
        <Stack gap="xl">
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                {["kpi-1", "kpi-2", "kpi-3", "kpi-4"].map((key) => (
                    <Skeleton key={key} height={68} radius="xl" />
                ))}
            </SimpleGrid>

            <Stack gap="sm">
                <Group gap="sm" align="center">
                    <Skeleton circle h={28} w={28} />
                    <Stack gap={4}>
                        <Skeleton height={14} width={112} radius="sm" />
                        <Skeleton height={10} width={136} radius="sm" />
                    </Stack>
                </Group>

                <SimpleGrid
                    cols={{ base: 2, sm: 3, lg: 4 }}
                    spacing={{ base: "sm", sm: "md" }}
                >
                    {[
                        "card-1",
                        "card-2",
                        "card-3",
                        "card-4",
                        "card-5",
                        "card-6",
                        "card-7",
                        "card-8",
                        "card-9",
                        "card-10",
                    ].map((key) => (
                        <Skeleton key={key} height={140} radius="lg" />
                    ))}
                </SimpleGrid>
            </Stack>
        </Stack>
    );
}

export default function HealthLoading() {
    return (
        <Container size="xl" pt="md">
            <Stack gap="xl">
                <Stack gap={4}>
                    <Skeleton height={28} width={168} radius="sm" />
                    <Skeleton height={14} width={188} radius="sm" />
                </Stack>
                <HealthLoadingContent />
            </Stack>
        </Container>
    );
}
