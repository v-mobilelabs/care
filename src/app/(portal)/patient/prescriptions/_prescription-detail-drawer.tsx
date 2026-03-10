import { useState } from "react";
import { Badge, Button, Divider, Drawer, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCapsule, IconCheck, IconSparkles } from "@tabler/icons-react";

import { useAddMedicationMutation, type FileRecord } from "@/app/(portal)/patient/_query";
import { colors } from "@/ui/tokens";
import { MedRow } from "./_med-row";

export function PrescriptionDetailDrawer({ file, onClose }: Readonly<{
    file: FileRecord | null;
    onClose: () => void;
}>) {
    const addMed = useAddMedicationMutation();
    const [allAdded, setAllAdded] = useState(false);

    const meds = file?.extractedData?.medications ?? [];
    const meta = file?.extractedData;

    async function handleAddAll() {
        for (const med of meds) {
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
        }
        setAllAdded(true);
        notifications.show({
            message: `${meds.length} medication${meds.length === 1 ? "" : "s"} added to My Medications.`,
            color: colors.success,
            icon: <IconCheck size={16} />,
        });
        onClose();
    }

    return (
        <Drawer
            opened={!!file}
            onClose={onClose}
            title={
                <Group gap="xs">
                    <ThemeIcon size={28} radius="md" color="primary" variant="light">
                        <IconSparkles size={16} />
                    </ThemeIcon>
                    <Text fw={600}>Extracted Medications</Text>
                </Group>
            }
            position="right"
            size="sm"
        >
            {file && (
                <Stack gap="md">
                    {(meta?.prescribedBy ?? meta?.date) && (
                        <Group gap="sm" wrap="wrap">
                            {meta?.prescribedBy && (
                                <Badge variant="light" color="gray" size="sm" radius="sm">
                                    Dr. {meta.prescribedBy}
                                </Badge>
                            )}
                            {meta?.date && (
                                <Badge variant="light" color="gray" size="sm" radius="sm">
                                    {meta.date}
                                </Badge>
                            )}
                        </Group>
                    )}
                    {meta?.notes && (
                        <Text size="xs" c="dimmed" style={{ fontStyle: "italic" }}>{meta.notes}</Text>
                    )}
                    <Divider />
                    {meds.length === 0 ? (
                        <Text c="dimmed" size="sm" ta="center" py="md">
                            No medications could be extracted.
                        </Text>
                    ) : (
                        <>
                            <Text size="sm" fw={600}>
                                {meds.length} medication{meds.length === 1 ? "" : "s"} found
                            </Text>
                            <Stack gap="sm">
                                {meds.map((med) => (
                                    <MedRow key={med.name} med={med} />
                                ))}
                            </Stack>
                            <Divider />
                            <Button
                                leftSection={<IconCapsule size={15} />}
                                color="primary"
                                variant="light"
                                loading={addMed.isPending}
                                disabled={allAdded}
                                onClick={() => { void handleAddAll(); }}
                                fullWidth
                            >
                                {allAdded ? "All added" : `Add all ${meds.length} to My Medications`}
                            </Button>
                        </>
                    )}
                </Stack>
            )}
        </Drawer>
    );
}
