import { useState } from "react";
import { ActionIcon, Badge, Box, Group, Paper, Text, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconPlus } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";

import { useAddMedicationMutation, type PrescriptionMedicationRecord } from "@/app/(portal)/patient/_query";
import { colors } from "@/ui/tokens";

export function MedRow({ med }: Readonly<{ med: PrescriptionMedicationRecord }>) {
    const addMed = useAddMedicationMutation();
    const [added, setAdded] = useState(false);

    async function handleAdd() {
        await addMed.mutateAsync({
            name: med.name,
            dosage: med.dosage,
            form: med.form,
            frequency: med.frequency,
            duration: med.duration,
            instructions: med.instructions,
            condition: med.indication,
            status: "active",
        });
        setAdded(true);
        notifications.show({
            message: `${med.name} added to My Medications.`,
            color: colors.success,
            icon: <IconCheck size={16} />,
        });
    }

    return (
        <Paper withBorder radius="md" p="sm" shadow="xs">
            <Group justify="space-between" wrap="nowrap" align="flex-start">
                <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={600} size="sm">{med.name}</Text>
                    <Group gap={6} mt={4} wrap="wrap">
                        {med.dosage && <Badge size="xs" variant="light" color="primary">{med.dosage}</Badge>}
                        {med.form && <Badge size="xs" variant="light" color="gray">{med.form}</Badge>}
                        {med.frequency && <Badge size="xs" variant="light" color="teal">{med.frequency}</Badge>}
                        {med.duration && <Badge size="xs" variant="light" color="violet">{med.duration}</Badge>}
                    </Group>
                    {med.instructions && (
                        <Text size="xs" c="dimmed" mt={4}>{med.instructions}</Text>
                    )}
                    {med.indication && (
                        <Text size="xs" c="dimmed" mt={2}>For: {med.indication}</Text>
                    )}
                </Box>
                <Tooltip label={added ? "Already added" : "Add to My Medications"} withArrow>
                    <ActionIcon
                        size={28}
                        variant={added ? "filled" : "light"}
                        color={added ? colors.success : "primary"}
                        loading={addMed.isPending}
                        onClick={() => { void handleAdd(); }}
                        disabled={added}
                        aria-label="Add to My Medications"
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            {added ? (
                                <motion.div
                                    key="check"
                                    initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
                                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                    exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
                                    transition={{ duration: 0.25, ease: "easeInOut" }}
                                    style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                                >
                                    <IconCheck size={14} />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="plus"
                                    initial={{ scale: 0.5, opacity: 0, rotate: 90 }}
                                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                    exit={{ scale: 0.5, opacity: 0, rotate: -90 }}
                                    transition={{ duration: 0.25, ease: "easeInOut" }}
                                    style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                                >
                                    <IconPlus size={14} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </ActionIcon>
                </Tooltip>
            </Group>
        </Paper>
    );
}
