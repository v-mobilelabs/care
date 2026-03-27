"use client";
import {
    Box,
    Button,
    Skeleton,
    Stack,
    Text,
    ThemeIcon,
} from "@mantine/core";
import { IconCapsule, IconPlus } from "@tabler/icons-react";

// ── Skeleton loader ───────────────────────────────────────────────────────────

export function MedicationSkeletons() {
    return (
        <Stack gap="sm">
            {["sk-a", "sk-b", "sk-c"].map((k) => (
                <Skeleton key={k} height={72} radius="lg" />
            ))}
        </Stack>
    );
}

// ── Empty state ───────────────────────────────────────────────────────────────

export function EmptyState({ onAdd }: Readonly<{ onAdd: () => void }>) {
    return (
        <Box py={80} style={{ textAlign: "center" }}>
            <ThemeIcon size={64} radius="xl" color="violet" variant="light" mx="auto" mb="md">
                <IconCapsule size={32} />
            </ThemeIcon>
            <Text fw={600} size="sm" mb={6}>No medications yet</Text>
            <Text size="sm" c="dimmed" maw={300} mx="auto" lh={1.6} mb="lg">
                Add your current medications to keep track. The AI will also suggest saving medications it detects during your sessions.
            </Text>
            <Button
                leftSection={<IconPlus size={15} />}
                color="primary"
                variant="light"
                onClick={onAdd}
            >
                Add your first medication
            </Button>
        </Box>
    );
}
