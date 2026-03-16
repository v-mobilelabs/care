import { useState } from "react";
import { Badge, Box, Button, Divider, Group, Modal, Stack, Text, ThemeIcon } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCalendar, IconCapsule, IconCheck, IconExternalLink, IconSparkles } from "@tabler/icons-react";

import { useAddMedicationMutation, type PrescriptionRecord } from "@/app/(portal)/patient/_query";
import { colors } from "@/ui/tokens";
import { MedRow } from "./_med-row";

function formatPrescriptionDate(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString("en-GB");
    } catch {
        return dateStr;
    }
}

export function PrescriptionDetailDrawer({ file, isExtracting, onExtract, onClose }: Readonly<{
    file: PrescriptionRecord | null;
    isExtracting: boolean;
    onExtract: () => void;
    onClose: () => void;
}>) {
    const addMed = useAddMedicationMutation();
    const [allAdded, setAllAdded] = useState(false);

    const meds = file?.medications ?? [];
    const hasMeds = meds.length > 0;

    const modalTitle = (() => {
        if (!file) return "Prescription";
        const doctor = file.prescribedBy;
        const date = file.prescriptionDate ? formatPrescriptionDate(file.prescriptionDate) : null;
        if (doctor && date) return `Dr. ${doctor} \u00b7 ${date}`;
        if (doctor) return `Dr. ${doctor}`;
        if (date) return `Prescription \u00b7 ${date}`;
        return "Prescription";
    })();

    async function handleAddAll() {
        for (const med of meds) {
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
        <Modal
            opened={!!file}
            onClose={onClose}
            title={
                <Text fw={600} size="sm" truncate="end" maw={320}>
                    {modalTitle}
                </Text>
            }
            size="lg"
            centered
        >
            {file && (
                <Stack gap="md" pb="sm">
                    {/* ── Unextracted state ─────────────────────────────────── */}
                    {!hasMeds && (
                        <Stack align="center" gap="md" py="xl">
                            <ThemeIcon size={56} radius="xl" color="primary" variant="light">
                                <IconSparkles size={28} />
                            </ThemeIcon>
                            <Box ta="center">
                                <Text fw={600} size="sm">No medications extracted yet</Text>
                                <Text size="xs" c="dimmed" mt={4}>
                                    Extract with AI to read medication details from this prescription.
                                </Text>
                            </Box>
                            {file.fileUrl && (
                                <Button
                                    component="a"
                                    href={file.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    leftSection={<IconExternalLink size={14} />}
                                    variant="subtle"
                                    color="gray"
                                    size="xs"
                                >
                                    View source
                                </Button>
                            )}
                            <Button
                                leftSection={<IconSparkles size={15} />}
                                color="primary"
                                loading={isExtracting}
                                disabled={isExtracting}
                                onClick={onExtract}
                                size="md"
                            >
                                Extract with AI
                            </Button>
                        </Stack>
                    )}

                    {/* ── Extracted state ────────────────────────────────────── */}
                    {hasMeds && (
                        <>
                            {/* Date + source link */}
                            <Group justify="space-between" align="center" wrap="nowrap">
                                <Box>
                                    {file.prescriptionDate && (
                                        <Badge
                                            variant="light"
                                            color="gray"
                                            size="md"
                                            radius="sm"
                                            leftSection={<IconCalendar size={11} />}
                                        >
                                            {formatPrescriptionDate(file.prescriptionDate)}
                                        </Badge>
                                    )}
                                </Box>
                                {file.fileUrl && (
                                    <Button
                                        component="a"
                                        href={file.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        leftSection={<IconExternalLink size={13} />}
                                        variant="subtle"
                                        color="gray"
                                        size="xs"
                                    >
                                        View source
                                    </Button>
                                )}
                            </Group>

                            {/* Notes / general instructions */}
                            {file.generalInstructions && (
                                <Text size="xs" c="dimmed" px={4}>
                                    {file.generalInstructions}
                                </Text>
                            )}
                            {file.notes && (
                                <Text size="xs" c="dimmed" style={{ fontStyle: "italic" }} px={4}>
                                    {file.notes}
                                </Text>
                            )}
                            {file.followUp && (
                                <Text size="xs" c="dimmed" px={4}>
                                    Follow-up: {file.followUp}
                                </Text>
                            )}

                            {/* Medications */}
                            <Divider label={`Medications (${meds.length})`} labelPosition="left" />
                            <Stack gap="sm">
                                {meds.map((med) => (
                                    <MedRow key={med.name} med={med} />
                                ))}
                            </Stack>

                            <Button
                                leftSection={<IconCapsule size={15} />}
                                color="primary"
                                variant="light"
                                loading={addMed.isPending}
                                disabled={allAdded}
                                onClick={() => { void handleAddAll(); }}
                                fullWidth
                                mt="xs"
                            >
                                {allAdded ? "All added" : `Add all ${meds.length} to My Medications`}
                            </Button>
                        </>
                    )}
                </Stack>
            )}
        </Modal>
    );
}
