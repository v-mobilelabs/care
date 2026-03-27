"use client";
import {
    Container,
    Group,
    Skeleton,
    Stack,
    Box,
} from "@mantine/core";

export default function SymptomsLoading() {
    return (
        <Container pt="md">
            <Stack gap="lg">
                {/* Header */}
                <Group justify="space-between" align="flex-start">
                    <Box>
                        <Skeleton height={18} width={180} mb={6} radius="md" />
                        <Skeleton height={12} width={220} radius="md" />
                    </Box>
                    <Skeleton height={36} width={120} radius="md" />
                </Group>

                {/* Safety alert */}
                <Skeleton height={52} radius="md" />

                {/* Search */}
                <Group gap="sm">
                    <Skeleton height={36} flex={1} radius="md" />
                    <Skeleton height={36} width={90} radius="md" />
                </Group>

                {/* Segmented control */}
                <Skeleton height={32} radius="md" />

                {/* Cards */}
                {["sk-a", "sk-b", "sk-c", "sk-d"].map((k) => (
                    <Skeleton key={k} height={80} radius="lg" />
                ))}
            </Stack>
        </Container>
    );
}
