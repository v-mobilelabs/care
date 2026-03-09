"use client";
import { ActionIcon, Badge, Box, Collapse, Divider, Group, List, Paper, SimpleGrid, Stack, Text, ThemeIcon, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCapsule, IconChevronDown, IconHeartbeat, IconNotes } from "@tabler/icons-react";
import type { PatientSummaryInput } from "@/app/(portal)/patient/_types";

export interface PatientSummaryCardProps {
    data: PatientSummaryInput;
}

export function PatientSummaryCard({ data }: Readonly<PatientSummaryCardProps>) {
    const [opened, { toggle }] = useDisclosure(false);
    const hasDiagnoses = data.diagnoses.length > 0;
    const hasMeds = data.medications.length > 0;
    const hasVitals = data.vitals.length > 0;
    const hasAllergies = data.allergies.length > 0;
    const hasRisks = data.riskFactors.length > 0;
    const hasRecs = data.recommendations.length > 0;
    const hasComplaints = data.chiefComplaints.length > 0;

    return (
        <Paper withBorder radius="lg" p={0} style={{ overflow: "hidden", borderLeft: "4px solid var(--mantine-color-primary-5)" }}>
            {/* Header */}
            <UnstyledButton onClick={toggle} style={{ width: "100%", display: "block" }}>
                <Group justify="space-between" px="md" py="sm">
                    <Group gap="xs">
                        <ThemeIcon size={32} radius="md" color="primary" variant="light">
                            <IconNotes size={17} />
                        </ThemeIcon>
                        <Box>
                            <Text fw={600} size="sm">{data.title}</Text>
                            <Text size="xs" c="dimmed">Patient Summary</Text>
                        </Box>
                    </Group>
                    <ActionIcon variant="subtle" color="gray" size="sm">
                        <IconChevronDown size={14} style={{ transform: opened ? "rotate(180deg)" : "none", transition: "transform 150ms ease" }} />
                    </ActionIcon>
                </Group>
            </UnstyledButton>

            <Divider />

            {/* Narrative */}
            <Box px="md" py="sm">
                <Text size="sm" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{data.narrative}</Text>
            </Box>

            {/* Expandable details */}
            <Collapse in={opened}>
                <Divider />
                <Stack gap="sm" px="md" py="sm">
                    {hasComplaints && (
                        <Box>
                            <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4}>Chief Complaints</Text>
                            <Group gap={6} wrap="wrap">
                                {data.chiefComplaints.map((c) => (
                                    <Badge key={c} variant="light" color="orange" size="sm">{c}</Badge>
                                ))}
                            </Group>
                        </Box>
                    )}

                    {hasDiagnoses && (
                        <Box>
                            <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4}>Diagnoses</Text>
                            <Stack gap={4}>
                                {data.diagnoses.map((d) => {
                                    let statusColor: string;
                                    if (d.status === "confirmed") statusColor = "teal";
                                    else if (d.status === "probable") statusColor = "yellow";
                                    else statusColor = "orange";
                                    return (
                                        <Group key={d.name} gap={8}>
                                            <Text size="sm" fw={500}>{d.name}</Text>
                                            {d.icd10 && <Badge size="xs" variant="outline" color="gray">{d.icd10}</Badge>}
                                            <Badge size="xs" variant="light" color={statusColor}>
                                                {d.status}
                                            </Badge>
                                        </Group>
                                    );
                                })}
                            </Stack>
                        </Box>
                    )}

                    {hasMeds && (
                        <Box>
                            <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4}>Medications</Text>
                            <Stack gap={4}>
                                {data.medications.map((m) => (
                                    <Group key={m.name} gap={6}>
                                        <ThemeIcon size={20} radius="xl" color="violet" variant="light"><IconCapsule size={11} /></ThemeIcon>
                                        <Text size="sm">{m.name}</Text>
                                        {m.dosage && <Text size="xs" c="dimmed">{m.dosage}</Text>}
                                        {m.frequency && <Text size="xs" c="dimmed">· {m.frequency}</Text>}
                                    </Group>
                                ))}
                            </Stack>
                        </Box>
                    )}

                    {hasVitals && (
                        <Box>
                            <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4}>Vitals</Text>
                            <SimpleGrid cols={2} spacing={6}>
                                {data.vitals.map((v) => (
                                    <Group key={v.name} gap={6}>
                                        <ThemeIcon size={20} radius="xl" color="red" variant="light"><IconHeartbeat size={11} /></ThemeIcon>
                                        <Text size="xs">{v.name}: <strong>{v.value}{v.unit ? ` ${v.unit}` : ""}</strong></Text>
                                    </Group>
                                ))}
                            </SimpleGrid>
                        </Box>
                    )}

                    {hasAllergies && (
                        <Box>
                            <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4}>Allergies</Text>
                            <Group gap={6} wrap="wrap">
                                {data.allergies.map((a) => (
                                    <Badge key={a} variant="light" color="red" size="sm">{a}</Badge>
                                ))}
                            </Group>
                        </Box>
                    )}

                    {hasRisks && (
                        <Box>
                            <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4}>Risk Factors</Text>
                            <Group gap={6} wrap="wrap">
                                {data.riskFactors.map((r) => (
                                    <Badge key={r} variant="light" color="yellow" size="sm">{r}</Badge>
                                ))}
                            </Group>
                        </Box>
                    )}

                    {hasRecs && (
                        <Box>
                            <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={4}>Recommendations</Text>
                            <List size="sm" spacing={4}>
                                {data.recommendations.map((rec) => (
                                    <List.Item key={rec}>{rec}</List.Item>
                                ))}
                            </List>
                        </Box>
                    )}
                </Stack>
            </Collapse>
        </Paper>
    );
}
