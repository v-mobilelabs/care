"use client";
import { Alert, Box, Collapse, Group, List, Paper, Stack, Text, ThemeIcon, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertTriangle, IconChecklist, IconChevronDown } from "@tabler/icons-react";
import type { NextStepsInput } from "@/app/(portal)/patient/_types";

export interface NextStepsCardProps {
    data: NextStepsInput;
}

export function NextStepsCard({ data }: Readonly<NextStepsCardProps>) {
    const [moreOpen, { toggle: toggleMore }] = useDisclosure(false);
    const hasMore = data.shortTerm.length > 0 || data.longTerm.length > 0;

    return (
        <Paper withBorder radius="lg" p={0} style={{ overflow: "hidden", borderLeft: "4px solid var(--mantine-color-primary-5)" }}>
            {/* ── Red flags — always first, impossible to miss ── */}
            {data.redFlags.length > 0 && (
                <Alert
                    color="red"
                    radius={0}
                    icon={<IconAlertTriangle size={16} />}
                    title="Seek emergency care immediately if you experience:"
                    styles={{ title: { marginBottom: 4 }, body: { gap: 4 } }}
                >
                    <List size="sm" spacing={3}>
                        {data.redFlags.map((s) => <List.Item key={s}>{s}</List.Item>)}
                    </List>
                </Alert>
            )}

            <Box px="md" pt="md" pb={hasMore ? "xs" : "md"}>
                <Stack gap="sm">
                    <Group gap="xs">
                        <ThemeIcon size={28} radius="md" color="primary" variant="light"><IconChecklist size={15} /></ThemeIcon>
                        <Box>
                            <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1, marginBottom: 1 }}>Next Steps</Text>
                            <Text fw={700} size="sm">{data.condition}</Text>
                        </Box>
                    </Group>

                    {/* Right Now — always visible */}
                    {data.immediate.length > 0 && (
                        <Box pl={36}>
                            <Text size="xs" fw={700} c="orange" tt="uppercase" style={{ letterSpacing: "0.5px" }} mb={6}>Right now</Text>
                            <List size="sm" spacing={5}>
                                {data.immediate.map((s) => <List.Item key={s}>{s}</List.Item>)}
                            </List>
                        </Box>
                    )}

                    {/* Short-term + Long-term — collapsed by default */}
                    {hasMore && (
                        <Collapse in={moreOpen}>
                            <Stack gap="sm" pl={36}>
                                {data.shortTerm.length > 0 && (
                                    <Box>
                                        <Text size="xs" fw={700} c="blue" tt="uppercase" style={{ letterSpacing: "0.5px" }} mb={6}>Next few weeks</Text>
                                        <List size="sm" spacing={5}>
                                            {data.shortTerm.map((s) => <List.Item key={s}>{s}</List.Item>)}
                                        </List>
                                    </Box>
                                )}
                                {data.longTerm.length > 0 && (
                                    <Box>
                                        <Text size="xs" fw={700} c="teal" tt="uppercase" style={{ letterSpacing: "0.5px" }} mb={6}>Ongoing</Text>
                                        <List size="sm" spacing={5}>
                                            {data.longTerm.map((s) => <List.Item key={s}>{s}</List.Item>)}
                                        </List>
                                    </Box>
                                )}
                            </Stack>
                        </Collapse>
                    )}
                </Stack>
            </Box>

            {/* Show more / less toggle */}
            {hasMore && (
                <UnstyledButton
                    onClick={toggleMore}
                    style={{
                        width: "100%",
                        padding: "8px 16px",
                        borderTop: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-4))",
                        background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                    }}
                >
                    <Text size="xs" c="dimmed" fw={500}>{moreOpen ? "Show less" : `Show ${data.shortTerm.length + data.longTerm.length} more steps`}</Text>
                    <IconChevronDown size={13} color="var(--mantine-color-dimmed)" style={{ transform: moreOpen ? "rotate(180deg)" : "none", transition: "transform 150ms ease" }} />
                </UnstyledButton>
            )}
        </Paper>
    );
}
