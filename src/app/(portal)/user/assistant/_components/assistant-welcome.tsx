"use client";

import { Alert, Button, Group, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconAlertTriangle, IconBolt, IconListCheck, IconStethoscope } from "@tabler/icons-react";
import Link, { useLinkStatus } from "@/ui/link";

type AssistantWelcomeProps = Readonly<{
    chatMode?: "quick" | "full";
}>;

const MODE_COPY = {
    quick: {
        icon: IconBolt,
        color: "primary",
        title: "Quick guidance",
        detail: "Faster, concise next-step guidance.",
    },
    full: {
        icon: IconListCheck,
        color: "violet",
        title: "Full assessment",
        detail: "Deeper analysis with structured rationale (about 15–20s).",
    },
} as const;

function UrgentCtaLabel() {
    const { pending } = useLinkStatus();
    return <>{pending ? "Opening…" : "Need urgent care?"}</>;
}

export function AssistantWelcome({ chatMode = "quick" }: Readonly<AssistantWelcomeProps>) {
    const mode = MODE_COPY[chatMode];
    const ModeIcon = mode.icon;

    return (
        <Stack gap="xs" mb="xs">
            <Paper withBorder radius="md" px="xs" py={6}>
                <Group gap={6} wrap="nowrap">
                    <ThemeIcon size={20} radius="sm" color={mode.color} variant="light">
                        <ModeIcon size={12} />
                    </ThemeIcon>
                    <Text size="xs" fw={600}>{mode.title}</Text>
                    <Text size="xs" c="dimmed" truncate>• {mode.detail}</Text>
                </Group>
            </Paper>

            <Alert
                color="gray"
                variant="light"
                radius="lg"
                icon={<IconAlertTriangle size={14} />}
                p="sm"
            >
                <Group justify="space-between" align="center" gap="xs" wrap="wrap">
                    <Text size="xs" c="dimmed">
                        Not for emergencies. If symptoms are severe or rapidly worsening, seek urgent care immediately.
                    </Text>
                    <Button
                        size="compact-xs"
                        variant="subtle"
                        color="orange"
                        leftSection={<IconStethoscope size={12} />}
                        component={Link}
                        href="/user/connect"
                    >
                        <UrgentCtaLabel />
                    </Button>
                </Group>
            </Alert>
        </Stack>
    );
}
