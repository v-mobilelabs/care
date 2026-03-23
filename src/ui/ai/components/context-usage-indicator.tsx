"use client";
import { Box, Group, RingProgress, Stack, Text, Tooltip } from "@mantine/core";

export interface ContextUsageIndicatorProps {
    /** Input (prompt) tokens consumed — this is the actual context window fill. */
    inputTokens: number;
    /** Output (completion) tokens generated. */
    outputTokens: number;
    /** Maximum context window size in tokens. */
    maxTokens: number;
}

function fmtTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
}

export function ContextUsageIndicator({ inputTokens, outputTokens, maxTokens }: Readonly<ContextUsageIndicatorProps>) {
    const total = inputTokens + outputTokens;
    const pct = maxTokens > 0 ? Math.min((total / maxTokens) * 100, 100) : 0;
    const ringColor = pct > 90 ? "red" : pct > 70 ? "orange" : "white";

    return (
        <Tooltip
            label={
                <Stack gap={2}>
                    <Text size="xs" fw={600}>Context window</Text>
                    <Group justify="space-between" gap="xs">
                        <Text size="xs" style={{ opacity: 0.7 }}>Input</Text>
                        <Text size="xs" fw={500}>{fmtTokens(inputTokens)}</Text>
                    </Group>
                    <Group justify="space-between" gap="xs">
                        <Text size="xs" style={{ opacity: 0.7 }}>Output</Text>
                        <Text size="xs" fw={500}>{fmtTokens(outputTokens)}</Text>
                    </Group>
                    <Box style={{ borderTop: "1px solid light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.15))" }} pt={2} mt={2}>
                        <Group justify="space-between" gap="xs">
                            <Text size="xs" fw={600} style={{ opacity: 0.7 }}>Total</Text>
                            <Text size="xs" fw={600}>{fmtTokens(total)} / {fmtTokens(maxTokens)}</Text>
                        </Group>
                    </Box>
                </Stack>
            }
            withArrow
            position="top"
            multiline
            w={200}
            styles={{
                tooltip: {
                    background: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))",
                    color: "light-dark(var(--mantine-color-dark-9), var(--mantine-color-gray-0))",
                    border: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-4))",
                    boxShadow: "var(--mantine-shadow-md)",
                },
                arrow: {
                    background: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))",
                    borderColor: "light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-4))",
                },
            }}
        >
            <Group
                gap={4}
                wrap="nowrap"
                style={{
                    cursor: "default",
                    padding: "2px 8px 2px 4px",
                    borderRadius: 999,
                    background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-5))",
                }}
            >
                <RingProgress
                    size={22}
                    thickness={2}
                    roundCaps
                    rootColor="var(--mantine-color-dark-6)"
                    sections={[{ value: Math.max(pct, 2), color: ringColor }]}
                />
                <Text size="xs" fw={600} c="dimmed" style={{ lineHeight: 1, whiteSpace: "nowrap" }}>
                    {fmtTokens(total)}
                </Text>
            </Group>
        </Tooltip>
    );
}
