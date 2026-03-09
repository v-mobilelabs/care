"use client";
import { ActionIcon, Badge, Box, Collapse, Group, Paper, Table, Text, ThemeIcon, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconBookmark, IconBookmarkFilled, IconCapsule, IconCheck, IconChevronDown, IconClipboardHeart } from "@tabler/icons-react";
import { useState } from "react";
import { useAddMedicationMutation } from "@/app/(portal)/patient/_query";
import type { PrescriptionInput } from "@/app/(portal)/patient/_types";

export interface PrescriptionCardProps {
    data: PrescriptionInput;
}

export function PrescriptionCard({ data }: Readonly<PrescriptionCardProps>) {
    const addMedication = useAddMedicationMutation();
    const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
    const [opened, { toggle }] = useDisclosure(false);

    function handleSaveMed(name: string, dosage: string, frequency: string, duration: string) {
        const key = `${name}:${dosage}`;
        if (savedIds.has(key)) return;
        addMedication.mutate(
            { name, dosage: dosage || undefined, frequency: frequency || undefined, duration: duration || undefined, condition: data.condition || undefined, status: "active" },
            {
                onSuccess: () => {
                    setSavedIds((prev) => { const s = new Set(prev); s.add(key); return s; });
                    notifications.show({ title: "Medication saved", message: `${name} added to your medications.`, color: "teal", icon: <IconCheck size={16} /> });
                },
            },
        );
    }

    return (
        <Paper withBorder radius="lg" p={0} style={{ overflow: "hidden", borderLeft: "4px solid var(--mantine-color-violet-5)" }}>
            <UnstyledButton onClick={toggle} style={{ width: "100%", display: "block" }} aria-expanded={opened}>
                <Box px="md" py="sm">
                    <Group gap="sm" wrap="nowrap" align="center">
                        <ThemeIcon size={32} radius="md" color="violet" variant="filled" style={{ flexShrink: 0 }}>
                            <IconClipboardHeart size={16} />
                        </ThemeIcon>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                            <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1, marginBottom: 1 }}>Prescription</Text>
                            <Text fw={700} size="sm" style={{ lineHeight: 1.3 }}>{data.title}</Text>
                            <Text size="xs" c="dimmed">{data.condition}</Text>
                        </Box>
                        <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                            <Badge size="xs" color="violet" variant="light">{data.medications.length} med{data.medications.length > 1 ? "s" : ""}</Badge>
                            {data.urgent && <Badge color="red" size="xs" variant="filled">Urgent</Badge>}
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
                    <Box style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                        <Table verticalSpacing="xs" fz="sm" withTableBorder withColumnBorders style={{ minWidth: 380 }}>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Medication</Table.Th>
                                    <Table.Th>Dosage</Table.Th>
                                    <Table.Th>Frequency</Table.Th>
                                    <Table.Th>Duration</Table.Th>
                                    <Table.Th></Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {data.medications.map((m) => {
                                    const key = `${m.name}:${m.dosage}`;
                                    const saved = savedIds.has(key);
                                    return (
                                        <Table.Tr key={key}>
                                            <Table.Td>
                                                <Group gap={6}><IconCapsule size={13} /><Text size="sm" fw={500}>{m.name}</Text><Badge size="xs" variant="dot" color="gray">{m.form}</Badge></Group>
                                            </Table.Td>
                                            <Table.Td>{m.dosage}</Table.Td>
                                            <Table.Td>{m.frequency}</Table.Td>
                                            <Table.Td>{m.duration}</Table.Td>
                                            <Table.Td>
                                                <ActionIcon
                                                    size={22}
                                                    variant={saved ? "filled" : "subtle"}
                                                    color={saved ? "teal" : "gray"}
                                                    onClick={() => handleSaveMed(m.name, m.dosage, m.frequency, m.duration)}
                                                    disabled={saved || addMedication.isPending}
                                                    title={saved ? "Saved to my medications" : "Save to my medications"}
                                                >
                                                    {saved ? <IconBookmarkFilled size={12} /> : <IconBookmark size={12} />}
                                                </ActionIcon>
                                            </Table.Td>
                                        </Table.Tr>
                                    );
                                })}
                            </Table.Tbody>
                        </Table>
                        {data.notes && <Text size="xs" c="dimmed" mt={6}>📝 {data.notes}</Text>}
                    </Box>
                </Box>
            </Collapse>
        </Paper>
    );
}
