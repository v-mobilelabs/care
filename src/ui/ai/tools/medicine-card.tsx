"use client";
import { ActionIcon, Badge, Box, Collapse, Group, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconBookmark, IconBookmarkFilled, IconCapsule, IconCheck, IconChevronDown } from "@tabler/icons-react";
import { useState } from "react";
import { useAddMedicationMutation } from "@/app/(portal)/chat/_query";
import type { MedicineInput } from "@/app/(portal)/chat/_types";

export interface MedicineCardProps {
    data: MedicineInput;
}

export function MedicineCard({ data }: Readonly<MedicineCardProps>) {
    const addMedication = useAddMedicationMutation();
    const [saved, setSaved] = useState(false);

    function handleSave() {
        if (saved) return;
        addMedication.mutate(
            { name: data.name, dosage: data.dosage || undefined, frequency: data.frequency || undefined, duration: data.duration || undefined, instructions: data.notes || undefined, status: "active" },
            {
                onSuccess: () => {
                    setSaved(true);
                    notifications.show({ title: "Medication saved", message: `${data.name} added to your medications.`, color: "teal", icon: <IconCheck size={16} /> });
                },
            },
        );
    }

    const [opened, { toggle }] = useDisclosure(false);

    return (
        <Paper withBorder radius="lg" p={0} style={{ overflow: "hidden", borderLeft: "4px solid var(--mantine-color-teal-5)" }}>
            <Box
                px="md" py="sm"
                style={{ background: "light-dark(var(--mantine-color-teal-0), rgba(0,0,0,0.2))", cursor: "pointer" }}
                onClick={toggle}
                aria-expanded={opened}
            >
                <Group gap="sm" wrap="nowrap" align="center">
                    <ThemeIcon size={32} radius="md" color="teal" variant="filled" style={{ flexShrink: 0 }}>
                        <IconCapsule size={16} />
                    </ThemeIcon>
                    <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1, marginBottom: 1 }}>Medication</Text>
                        <Group gap={6} wrap="nowrap">
                            <Text fw={700} size="sm" style={{ lineHeight: 1.3 }}>{data.name}</Text>
                            <Badge size="xs" color="teal" variant="light" style={{ flexShrink: 0 }}>{data.category}</Badge>
                        </Group>
                    </Box>
                    <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                        <ActionIcon
                            size={26}
                            variant={saved ? "filled" : "subtle"}
                            color={saved ? "teal" : "gray"}
                            onClick={(e) => { e.stopPropagation(); handleSave(); }}
                            disabled={saved || addMedication.isPending}
                            loading={addMedication.isPending}
                            title={saved ? "Saved" : "Save to medications"}
                        >
                            {saved ? <IconBookmarkFilled size={13} /> : <IconBookmark size={13} />}
                        </ActionIcon>
                        <ThemeIcon size={20} radius="xl" color="gray" variant="subtle"
                            style={{ transition: "transform 200ms ease", transform: opened ? "rotate(180deg)" : "rotate(0deg)" }}>
                            <IconChevronDown size={13} />
                        </ThemeIcon>
                    </Group>
                </Group>
            </Box>
            <Collapse in={opened}>
                <Box px="md" py="sm">
                    <Stack gap="xs">
                        <Text size="xs" c="dimmed" lh={1.5}>{data.indication}</Text>
                        <Group gap={6} wrap="wrap">
                            <Badge size="sm" color="teal" variant="outline">{data.dosage}</Badge>
                            <Badge size="sm" color="gray" variant="outline">{data.frequency}</Badge>
                            {data.duration && <Badge size="sm" color="gray" variant="outline">{data.duration}</Badge>}
                        </Group>
                        {data.warnings && data.warnings.length > 0 && (
                            <Group gap={4} wrap="wrap">
                                {data.warnings.map((w) => <Badge key={w} size="xs" color="orange" variant="light">⚠ {w}</Badge>)}
                            </Group>
                        )}
                    </Stack>
                </Box>
            </Collapse>
        </Paper>
    );
}
