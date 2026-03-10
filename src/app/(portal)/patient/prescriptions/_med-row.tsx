import { useState } from "react";
import { ActionIcon, Badge, Box, Group, Paper, Text, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconPlus } from "@tabler/icons-react";

import { useAddMedicationMutation, type ExtractedMedication } from "@/app/(portal)/patient/_query";
import { colors } from "@/ui/tokens";

export function MedRow({ med }: Readonly<{ med: ExtractedMedication }>) {
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
            condition: med.condition,
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
                    {med.condition && (
                        <Text size="xs" c="dimmed" mt={2}>For: {med.condition}</Text>
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
                        {added ? <IconCheck size={14} /> : <IconPlus size={14} />}
                    </ActionIcon>
                </Tooltip>
            </Group>
        </Paper>
    );
}
