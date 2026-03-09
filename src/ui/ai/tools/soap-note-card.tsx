"use client";
import { ActionIcon, Badge, Box, Collapse, Divider, Group, List, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconChevronDown, IconCopy, IconNotes } from "@tabler/icons-react";
import { RISK_COLOR } from "@/app/(portal)/chat/_types";
import type { SoapNoteInput } from "@/app/(portal)/chat/_types";
import { parseInline, MarkdownContent } from "@/app/(portal)/chat/_components/markdown";

export interface SoapNoteCardProps {
    data: SoapNoteInput;
}

export function SoapNoteCard({ data }: Readonly<SoapNoteCardProps>) {
    const [open, { toggle }] = useDisclosure(false);
    const riskColor = RISK_COLOR[data.riskLevel];

    function handleCopy(e: React.MouseEvent) {
        e.stopPropagation();
        const text = [
            `Clinical Summary — ${data.condition}`,
            `Risk level: ${data.riskLevel}`,
            ``,
            `SUBJECTIVE`, data.subjective,
            ``,
            `OBJECTIVE`, data.objective,
            ``,
            `ASSESSMENT`, data.assessment,
            ``,
            `PLAN`,
            ...data.plan.map((p, i) => `${i + 1}. ${p}`),
        ].join("\n");
        void navigator.clipboard.writeText(text).then(() => {
            notifications.show({ message: "Clinical summary copied to clipboard", color: "violet", autoClose: 2500 });
        });
    }

    return (
        <Paper withBorder radius="lg" p={0} style={{ overflow: "hidden", borderLeft: `4px solid var(--mantine-color-${riskColor}-5)` }}>
            {/* ── Header — always visible, tap to expand ── */}
            <Box px="md" py="sm" onClick={toggle} style={{ cursor: "pointer" }}>
                <Group justify="space-between" wrap="nowrap" align="center">
                    <Group gap="xs" wrap="nowrap" align="center" style={{ flex: 1, minWidth: 0 }}>
                        <ThemeIcon size={28} radius="md" color="violet" variant="light" style={{ flexShrink: 0 }}><IconNotes size={15} /></ThemeIcon>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                            <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1, marginBottom: 1 }}>Clinical Note</Text>
                            <Text fw={700} size="sm">{data.condition}</Text>
                        </Box>
                    </Group>
                    <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
                        <Badge color={riskColor} size="sm" tt="capitalize" variant="light">{data.riskLevel} risk</Badge>
                        <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="gray"
                            title="Copy to clipboard"
                            onClick={handleCopy}
                        >
                            <IconCopy size={14} />
                        </ActionIcon>
                        <IconChevronDown
                            size={15}
                            color="var(--mantine-color-dimmed)"
                            style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms ease", flexShrink: 0 }}
                        />
                    </Group>
                </Group>
            </Box>

            {/* ── Body — collapsed by default ── */}
            <Collapse in={open}>
                <Divider />
                <Box px="md" py="sm">
                    <Stack gap="md">
                        {[
                            { label: "S — Subjective", value: data.subjective },
                            { label: "O — Objective", value: data.objective },
                            { label: "A — Assessment", value: data.assessment },
                        ].map(({ label, value }) => (
                            <Box key={label}>
                                <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.5px" }} mb={3}>{label}</Text>
                                <MarkdownContent text={value} />
                            </Box>
                        ))}
                        {data.plan.length > 0 && (
                            <Box>
                                <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.5px" }} mb={4}>P — Plan</Text>
                                <List size="sm" spacing={4}>
                                    {data.plan.map((p, i) => (
                                        <List.Item key={`plan-${p}`}><Text component="span" size="sm">{parseInline(p, Number(p.codePointAt(0)))}</Text></List.Item>
                                    ))}
                                </List>
                            </Box>
                        )}
                    </Stack>
                </Box>
            </Collapse>
        </Paper>
    );
}
