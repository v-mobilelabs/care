"use client";

import { Alert, Button, Group, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconStethoscope } from "@tabler/icons-react";
import Link, { useLinkStatus } from "@/ui/link";

function UrgentCtaLabel() {
    const { pending } = useLinkStatus();
    return <>{pending ? "Opening…" : "Need urgent care?"}</>;
}

export function AssistantWelcome() {
    return (
        <Stack gap="xs" mb="xs">
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
