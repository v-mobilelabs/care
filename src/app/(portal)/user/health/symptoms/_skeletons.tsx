"use client";
import {
    Box,
    Button,
    Skeleton,
    Stack,
    Text,
    ThemeIcon,
} from "@mantine/core";
import { IconActivityHeartbeat, IconPlus } from "@tabler/icons-react";

// ── Skeleton loader ───────────────────────────────────────────────────────────

export function ObservationSkeletons() {
    return (
        <Stack gap="sm">
            {["sk-a", "sk-b", "sk-c", "sk-d", "sk-e"].map((k) => (
                <Skeleton key={k} height={80} radius="lg" />
            ))}
        </Stack>
    );
}

// ── Empty state ───────────────────────────────────────────────────────────────

export function EmptyState({ onAdd }: Readonly<{ onAdd: () => void }>) {
    return (
        <Box py={80} style={{ textAlign: "center" }}>
            <ThemeIcon size={64} radius="xl" color="grape" variant="light" mx="auto" mb="md">
                <IconActivityHeartbeat size={32} />
            </ThemeIcon>
            <Text fw={600} size="sm" mb={6}>No symptom observations yet</Text>
            <Text size="sm" c="dimmed" maw={320} mx="auto" lh={1.6} mb="lg">
                Your symptom timeline is automatically populated from AI assessments
                and chat sessions. You can also log observations manually.
            </Text>
            <Button
                leftSection={<IconPlus size={15} />}
                color="grape"
                variant="light"
                onClick={onAdd}
            >
                Log a symptom
            </Button>
        </Box>
    );
}

// ── No results (search/filter) ────────────────────────────────────────────────

export function NoResultsState() {
    return (
        <Box py={60} style={{ textAlign: "center" }}>
            <Text size="sm" c="dimmed">No observations match your current filters.</Text>
        </Box>
    );
}
