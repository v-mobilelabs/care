"use client";
import {
    Box,
    Button,
    Skeleton,
    Stack,
    Text,
    ThemeIcon,
} from "@mantine/core";
import { IconHeartFilled, IconPlus } from "@tabler/icons-react";

// ── Skeleton loader ───────────────────────────────────────────────────────────

export function VitalSkeletons() {
    return (
        <Stack gap="sm">
            {["sk-a", "sk-b", "sk-c", "sk-d"].map((k) => (
                <Skeleton key={k} height={72} radius="lg" />
            ))}
        </Stack>
    );
}

// ── Empty state ───────────────────────────────────────────────────────────────

export function EmptyState({ onAdd }: Readonly<{ onAdd: () => void }>) {
    return (
        <Box py={80} style={{ textAlign: "center" }}>
            <ThemeIcon size={64} radius="xl" color="red" variant="light" mx="auto" mb="md">
                <IconHeartFilled size={32} />
            </ThemeIcon>
            <Text fw={600} size="sm" mb={6}>No vitals logged yet</Text>
            <Text size="sm" c="dimmed" maw={300} mx="auto" lh={1.6} mb="lg">
                Track your blood pressure, heart rate, temperature, SpO2, glucose,
                weight, and more. The AI assistant can also log vitals from your
                conversations automatically.
            </Text>
            <Button
                leftSection={<IconPlus size={15} />}
                color="primary"
                variant="light"
                onClick={onAdd}
            >
                Log your first vitals
            </Button>
        </Box>
    );
}
