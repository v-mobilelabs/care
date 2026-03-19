import { Box, Group, SimpleGrid, Skeleton, Stack, ThemeIcon } from "@mantine/core";
import { IconUsers } from "@tabler/icons-react";

function Header() {
    return (
        <Box px={{ base: "md", sm: "xl" }} py="md" style={{ flexShrink: 0, borderBottom: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))", background: "light-dark(white, var(--mantine-color-dark-8))" }}>
            <Group justify="space-between" align="center">
                <Group gap="sm">
                    <ThemeIcon size={34} radius="md" color="primary" variant="light"><IconUsers size={18} /></ThemeIcon>
                    <Stack gap={4}><Skeleton height={14} width={120} /><Skeleton height={10} width={100} /></Stack>
                </Group>
                <Skeleton height={36} width={120} radius="md" />
            </Group>
        </Box>
    );
}

export default function FamilyMembersLoading() {
    return (
        <Box style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            <Header />
            <Box px={{ base: "md", sm: "xl" }} py="lg" maw={900} mx="auto" w="100%">
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    {["a", "b", "c"].map((k) => <Skeleton key={k} height={148} radius="lg" />)}
                </SimpleGrid>
            </Box>
        </Box>
    );
}
