"use client";
import { Button, Group, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconCheck, IconMedicineSyrup, IconX } from "@tabler/icons-react";

interface ApprovalCardProps {
    approval: { id: string };
    input: unknown;
    onApproval: (opts: { id: string; approved: boolean; reason?: string }) => void;
}

export function ApprovalCard({ approval, input, onApproval }: Readonly<ApprovalCardProps>) {
    const medNames =
        input && typeof input === "object" && Array.isArray((input as Record<string, unknown>).medications)
            ? ((input as Record<string, unknown>).medications as { name: string }[]).map((m) => m.name).join(", ")
            : null;

    return (
        <Paper withBorder radius="lg" p="md" style={{ borderColor: "var(--mantine-color-orange-4)" }}>
            <Stack gap="sm">
                <Group gap="xs">
                    <ThemeIcon size={28} radius="md" color="orange" variant="light"><IconMedicineSyrup size={15} /></ThemeIcon>
                    <Text size="sm" fw={600}>Prescription ready — approve to save</Text>
                </Group>
                {medNames && <Text size="xs" c="dimmed">{medNames}</Text>}
                <Group gap="sm">
                    <Button size="sm" color="teal" leftSection={<IconCheck size={14} />}
                        onClick={() => onApproval({ id: approval.id, approved: true })}>
                        Approve
                    </Button>
                    <Button size="sm" color="red" variant="outline" leftSection={<IconX size={14} />}
                        onClick={() => onApproval({ id: approval.id, approved: false, reason: "Patient declined" })}>
                        Decline
                    </Button>
                </Group>
            </Stack>
        </Paper>
    );
}
