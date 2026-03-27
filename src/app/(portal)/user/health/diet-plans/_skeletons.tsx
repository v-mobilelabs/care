"use client";
import {
    Box,
    Button,
    Skeleton,
    Stack,
    Text,
    ThemeIcon,
} from "@mantine/core";
import { IconPlus, IconSalad } from "@tabler/icons-react";

export function DietPlanSkeletons() {
    return (
        <Stack gap="sm">
            {["sk-a", "sk-b", "sk-c"].map((k) => (
                <Skeleton key={k} height={100} radius="lg" />
            ))}
        </Stack>
    );
}

export function EmptyState({ onCreateDietPlan }: Readonly<{ onCreateDietPlan: () => void }>) {
    return (
        <Box py={80} style={{ textAlign: "center" }}>
            <ThemeIcon size={64} radius="xl" color="green" variant="light" mx="auto" mb="md">
                <IconSalad size={32} />
            </ThemeIcon>
            <Text fw={600} size="sm" mb={6}>No diet plans saved yet</Text>
            <Text size="sm" c="dimmed" maw={320} mx="auto" lh={1.6} mb="lg">
                When the AI generates a diet plan during your session, you can save it here by tapping &ldquo;Save plan&rdquo; on the diet card.
            </Text>
            <Button
                leftSection={<IconPlus size={16} />}
                color="green"
                variant="light"
                onClick={onCreateDietPlan}
            >
                Create diet plan
            </Button>
        </Box>
    );
}
