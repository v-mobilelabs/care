"use client";
import { Badge, Box, Collapse, Divider, Group, List, Paper, Stack, Text, ThemeIcon, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconChevronDown, IconCircleCheck, IconShieldCheck } from "@tabler/icons-react";
import { RISK_COLOR } from "@/app/(portal)/patient/_types";
import type { AssessmentInput } from "@/app/(portal)/patient/_types";

export interface AssessmentCardProps {
    data: AssessmentInput;
}

export function AssessmentCompleteCard({ data }: Readonly<AssessmentCardProps>) {
    const rc = RISK_COLOR[data.riskLevel];
    const [opened, { toggle }] = useDisclosure(false);
    return (
        <Paper withBorder radius="lg" p={0} style={{ overflow: "hidden", borderLeft: `4px solid var(--mantine-color-${rc}-5)` }}>
            <UnstyledButton onClick={toggle} style={{ width: "100%", display: "block" }} aria-expanded={opened}>
                <Box px="md" py="sm" style={{ background: `light-dark(var(--mantine-color-${rc}-0), rgba(0,0,0,0.2))` }}>
                    <Group gap="sm" wrap="nowrap" align="center">
                        <ThemeIcon size={32} radius="md" color={rc} variant="filled" style={{ flexShrink: 0 }}>
                            <IconShieldCheck size={16} />
                        </ThemeIcon>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                            <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1, marginBottom: 1 }}>Assessment</Text>
                            <Text fw={700} size="sm" style={{ lineHeight: 1.3 }}>
                                {data.primaryDiagnosis ?? "Complete"}
                            </Text>
                        </Box>
                        <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                            <Badge color={rc} size="xs" variant="filled" tt="uppercase">{data.riskLevel} risk</Badge>
                            <ThemeIcon size={20} radius="xl" color="gray" variant="subtle"
                                style={{ transition: "transform 200ms ease", transform: opened ? "rotate(180deg)" : "rotate(0deg)" }}>
                                <IconChevronDown size={13} />
                            </ThemeIcon>
                        </Group>
                    </Group>
                </Box>
            </UnstyledButton>
            <Collapse in={opened}>
                <Box px="md" py="sm">
                    <Stack gap="sm">
                        <Text size="sm" lh={1.55}>{data.summary}</Text>
                        {data.immediateActions.length > 0 && (
                            <Box>
                                <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.5px" }} mb={6}>Immediate Steps</Text>
                                <List size="sm" spacing={4}
                                    icon={<ThemeIcon size={16} radius="xl" color={rc} variant="light"><IconCircleCheck size={10} /></ThemeIcon>}>
                                    {data.immediateActions.map((action) => <List.Item key={action}>{action}</List.Item>)}
                                </List>
                            </Box>
                        )}
                        <Divider />
                        <Text size="xs" c="dimmed" lh={1.5}>{data.disclaimer}</Text>
                    </Stack>
                </Box>
            </Collapse>
        </Paper>
    );
}
