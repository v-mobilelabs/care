"use client";
import { Card, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconCheck, IconInfoCircle, IconListCheck } from "@tabler/icons-react";
import type { ActionCardInput } from "@/data/shared/service/agents/base/tools/action-card.tool";

// ── Sub-components ────────────────────────────────────────────────────────────

function ActionCardHeader({ title, total }: Readonly<{ title: string; total: number }>) {
    const accent = "primary";
    const bg = "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))";

    return (
        <Card.Section withBorder px="sm" py="sm" style={{ background: bg, transition: "background 200ms ease" }}>
            <Group gap="sm" wrap="nowrap" align="center">
                <ThemeIcon size={32} radius="md" color={accent} variant="filled" style={{ flexShrink: 0 }}>
                    <IconListCheck size={16} />
                </ThemeIcon>
                <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                    <Text size="xs" c={accent} fw={500} style={{ lineHeight: 1, marginBottom: 1 }}>
                        {`${total} guided step${total === 1 ? "" : "s"}`}
                    </Text>
                    <Text fw={700} size="sm" style={{ lineHeight: 1.3 }}>{title}</Text>
                </Stack>
            </Group>
        </Card.Section>
    );
}

function ActionCardItem({ text }: Readonly<{ text: string }>) {
    return (
        <Group gap="xs" wrap="nowrap" align="flex-start" style={{ pointerEvents: "none", opacity: 0.98 }}>
            <ThemeIcon size={20} radius="xl" color="primary" variant="light" style={{ flexShrink: 0, marginTop: 1 }}>
                <IconCheck size={12} />
            </ThemeIcon>
            <Text size="sm" style={{ lineHeight: 1.45 }}>{text}</Text>
        </Group>
    );
}

function ActionCardDisclaimer({ text }: Readonly<{ text: string }>) {
    return (
        <Card.Section px="sm" py="xs" style={{ background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))" }}>
            <Group gap={6} wrap="nowrap" align="flex-start">
                <IconInfoCircle size={14} style={{ flexShrink: 0, marginTop: 2, color: "var(--mantine-color-dimmed)" }} />
                <Text size="xs" c="dimmed" lh={1.5}>{text}</Text>
            </Group>
        </Card.Section>
    );
}

// ── Main card ─────────────────────────────────────────────────────────────────

export function ActionCardCard({ data }: Readonly<{ data: ActionCardInput }>) {
    return (
        <Card withBorder radius="lg">
            <ActionCardHeader title={data.title} total={data.items.length} />
            <Card.Section px="sm" py="sm">
                <Stack gap="xs">
                    {data.items.map((item, i) => (
                        <ActionCardItem key={i} text={item} />
                    ))}
                </Stack>
            </Card.Section>
            {data.disclaimer && <ActionCardDisclaimer text={data.disclaimer} />}
        </Card>
    );
}
