"use client";
import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Center,
    Divider,
    Drawer,
    Group,
    Image,
    Paper,
    ScrollArea,
    SimpleGrid,
    Skeleton,
    Stack,
    Text,
    ThemeIcon,
    Title,
    Tooltip,
} from "@mantine/core";
import { useRef, useState } from "react";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
    IconCamera,
    IconCapsule,
    IconCheck,
    IconDownload,
    IconExternalLink,
    IconFileTypePdf,
    IconPhoto,
    IconPlus,
    IconReportMedical,
    IconSparkles,
    IconTrash,
    IconUpload,
} from "@tabler/icons-react";

import {
    usePrescriptionsQuery,
    useUploadPrescriptionMutation,
    useDeletePrescriptionMutation,
    useExtractPrescriptionMutation,
    useAddMedicationMutation,
    type FileRecord,
    type ExtractedMedication,
} from "@/app/(portal)/patient/_query";
import { colors } from "@/ui/tokens";
import { MedicationModal } from "@/app/(portal)/patient/medications/_content";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

// ── Per-medication row (add to My Medications) ───────────────────────────────

function MedRow({ med }: Readonly<{ med: ExtractedMedication }>) {
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
        <Paper withBorder radius="md" p="sm">
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

// ── Prescription detail drawer ────────────────────────────────────────────────

function PrescriptionDetailDrawer({ file, onClose }: Readonly<{
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

// ── Prescription card ─────────────────────────────────────────────────────────

function PrescriptionCard({ file, isPendingDelete, isExtracting, onDelete, onExtract, onViewMeds }: Readonly<{
    file: FileRecord;
    isPendingDelete: boolean;
    isExtracting: boolean;
    onDelete: () => void;
    onExtract: () => void;
    onViewMeds: () => void;
}>) {
    const isImage = file.mimeType.startsWith("image/");
    const isPdf = file.mimeType === "application/pdf";
    const extractedCount = file.extractedData?.medications.length ?? 0;
    const hasExtracted = extractedCount > 0;

    return (
        <Paper
            withBorder
            radius="lg"
            style={{
                overflow: "hidden",
                opacity: isPendingDelete ? 0.4 : 1,
                transition: "opacity 150ms ease, box-shadow 120ms ease",
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* Preview */}
            <Box
                style={{
                    aspectRatio: "4/3",
                    background: "light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    position: "relative",
                }}
            >
                {isImage && file.downloadUrl ? (
                    <Image
                        src={file.downloadUrl}
                        h="100%"
                        w="100%"
                        style={{ objectFit: "cover", position: "absolute", inset: 0 }}
                        alt={file.name}
                    />
                ) : (
                    <ThemeIcon size={44} radius="xl" color={isPdf ? colors.danger : "primary"} variant="light">
                        {isPdf ? <IconFileTypePdf size={22} /> : <IconPhoto size={22} />}
                    </ThemeIcon>
                )}

                {/* Badge */}
                <Badge
                    size="xs"
                    color={isPdf ? colors.danger : "primary"}
                    variant="filled"
                    radius="sm"
                    style={{ position: "absolute", top: 8, right: 8 }}
                >
                    {isPdf ? "PDF" : file.mimeType.split("/")[1]?.toUpperCase() ?? "Image"}
                </Badge>
            </Box>

            <Divider />

            {/* Metadata */}
            <Box px="sm" py="xs" style={{ flex: 1 }}>
                <Group justify="space-between" wrap="nowrap" gap={4}>
                    <Tooltip label={file.name} withArrow openDelay={400} multiline maw={240}>
                        <Text size="sm" fw={600} truncate="end" style={{ lineHeight: 1.3, flex: 1, minWidth: 0 }}>
                            {file.name}
                        </Text>
                    </Tooltip>
                </Group>
                <Group gap={4} mt={2}>
                    <Text size="xs" c="dimmed">{formatBytes(file.size)}</Text>
                    <Text size="xs" c="dimmed">·</Text>
                    <Text size="xs" c="dimmed">{formatDate(file.createdAt)}</Text>
                </Group>
            </Box>

            {/* Extracted medications badge */}
            {hasExtracted && (
                <Box px="sm" pb="xs">
                    <Button
                        size="xs"
                        variant="light"
                        color={colors.success}
                        leftSection={<IconCapsule size={12} />}
                        onClick={onViewMeds}
                        fullWidth
                    >
                        {extractedCount} medication{extractedCount === 1 ? "" : "s"} found
                    </Button>
                </Box>
            )}

            {/* Actions */}
            <Group gap={4} px="sm" pb="sm" justify="flex-end">
                <Tooltip label={hasExtracted ? "Re-extract with AI" : "Extract medications with AI"} withArrow>
                    <ActionIcon
                        size={28}
                        variant="light"
                        color="primary"
                        onClick={onExtract}
                        loading={isExtracting}
                        disabled={isPendingDelete}
                        aria-label="Extract prescription"
                    >
                        <IconSparkles size={14} />
                    </ActionIcon>
                </Tooltip>
                {file.downloadUrl && (
                    <>
                        <Tooltip label="Open in new tab" withArrow>
                            <ActionIcon
                                size={28}
                                variant="subtle"
                                color="gray"
                                component="a"
                                href={file.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Open prescription"
                            >
                                <IconExternalLink size={14} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Download" withArrow>
                            <ActionIcon
                                size={28}
                                variant="subtle"
                                color="primary"
                                component="a"
                                href={file.downloadUrl}
                                download={file.name}
                                aria-label="Download prescription"
                            >
                                <IconDownload size={14} />
                            </ActionIcon>
                        </Tooltip>
                    </>
                )}
                <Tooltip label="Delete" withArrow>
                    <ActionIcon
                        size={28}
                        variant="subtle"
                        color="red"
                        onClick={onDelete}
                        disabled={isPendingDelete || isExtracting}
                        aria-label="Delete prescription"
                    >
                        <IconTrash size={14} />
                    </ActionIcon>
                </Tooltip>
            </Group>
        </Paper>
    );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyPrescriptions({ onCameraCapture, onFileSelect }: Readonly<{
    onCameraCapture: () => void;
    onFileSelect: () => void;
}>) {
    return (
        <Center style={{ flex: 1, flexDirection: "column", gap: 16 }} py="xl">
            <ThemeIcon size={72} radius="xl" color="primary" variant="light">
                <IconReportMedical size={36} />
            </ThemeIcon>
            <Stack gap={4} align="center">
                <Title order={4} c="dimmed">No prescriptions yet</Title>
                <Text size="sm" c="dimmed" ta="center" maw={340}>
                    Take a photo of your prescription or upload an image / PDF.
                    Tap <strong>✦</strong> on any card to auto-detect medications with AI.
                </Text>
            </Stack>
            <Group gap="sm" justify="center">
                <Button
                    leftSection={<IconCamera size={16} />}
                    variant="filled"
                    color="primary"
                    onClick={onCameraCapture}
                >
                    Take Photo
                </Button>
                <Button
                    leftSection={<IconUpload size={16} />}
                    variant="light"
                    color="primary"
                    onClick={onFileSelect}
                >
                    Upload File
                </Button>
            </Group>
        </Center>
    );
}

// ── Main content ──────────────────────────────────────────────────────────────

export function PrescriptionsContent() {
    const { data: prescriptions = [], isLoading } = usePrescriptionsQuery();
    const upload = useUploadPrescriptionMutation();
    const deleteRx = useDeletePrescriptionMutation();
    const extract = useExtractPrescriptionMutation();

    const cameraInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [addMedOpened, { open: openAddMed, close: closeAddMed }] = useDisclosure(false);

    const [extractingFileId, setExtractingFileId] = useState<string | null>(null);
    const [detailFileId, setDetailFileId] = useState<string | null>(null);
    const detailFile = prescriptions.find((f) => f.id === detailFileId) ?? null;

    function handleFiles(files: FileList | null) {
        if (!files || files.length === 0) return;
        Array.from(files).forEach((file) => {
            upload.mutate({ file }, {
                onSuccess: () =>
                    notifications.show({
                        message: `${file.name} saved.`,
                        color: colors.success,
                        icon: <IconCheck size={16} />,
                    }),
                onError: (err) =>
                    notifications.show({
                        title: "Upload failed",
                        message: err instanceof Error ? err.message : "Unknown error",
                        color: colors.danger,
                    }),
            });
        });
    }

    function handleExtract(file: FileRecord) {
        setExtractingFileId(file.id);
        extract.mutate({ fileId: file.id, sessionId: file.sessionId ?? undefined }, {
            onSuccess: (result) => {
                setExtractingFileId(null);
                const count = result.medications.length;
                const plural = count === 1 ? "" : "s";
                notifications.show({
                    message: count > 0
                        ? `${count} medication${plural} extracted. Tap the card to add to My Medications.`
                        : "No medications found in this prescription.",
                    color: count > 0 ? colors.success : "gray",
                    icon: count > 0 ? <IconCheck size={16} /> : undefined,
                });
                if (count > 0) setDetailFileId(file.id);
            },
            onError: (err) => {
                setExtractingFileId(null);
                notifications.show({
                    title: "Extraction failed",
                    message: err instanceof Error ? err.message : "Could not extract prescription data.",
                    color: colors.danger,
                });
            },
        });
    }

    function handleDelete(file: FileRecord) {
        modals.openConfirmModal({
            title: "Delete prescription?",
            children: (
                <Text size="sm">
                    <strong>{file.name}</strong> will be permanently removed. This cannot be undone.
                </Text>
            ),
            labels: { confirm: "Delete", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => {
                deleteRx.mutate(
                    { fileId: file.id },
                    {
                        onSuccess: () =>
                            notifications.show({
                                message: `${file.name} deleted.`,
                                color: colors.success,
                                icon: <IconCheck size={16} />,
                            }),
                    },
                );
            },
        });
    }

    return (
        <Box style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            {/* Add Medication modal */}
            <MedicationModal opened={addMedOpened} onClose={closeAddMed} />

            {/* Detail drawer — key resets state when switching between prescriptions */}
            <PrescriptionDetailDrawer
                key={detailFileId ?? ""}
                file={detailFile}
                onClose={() => setDetailFileId(null)}
            />

            {/* Hidden inputs */}
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={(e) => handleFiles(e.target.files)}
                onClick={(e) => { (e.target as HTMLInputElement).value = ""; }}
            />
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                style={{ display: "none" }}
                onChange={(e) => handleFiles(e.target.files)}
                onClick={(e) => { (e.target as HTMLInputElement).value = ""; }}
            />

            {/* Header */}
            <Box
                px={{ base: "md", sm: "xl" }}
                py="md"
                style={{
                    flexShrink: 0,
                    borderBottom: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                    background: "light-dark(white, var(--mantine-color-dark-8))",
                }}
            >
                <Group justify="space-between" align="center">
                    <Group gap="sm">
                        <ThemeIcon size={36} radius="md" color="primary" variant="light">
                            <IconReportMedical size={20} />
                        </ThemeIcon>
                        <Box>
                            <Title order={4} lh={1.2}>Prescriptions</Title>
                            <Text size="xs" c="dimmed">
                                Store photos &amp; PDFs — hit ✦ to extract medications with AI
                            </Text>
                        </Box>
                    </Group>
                    <Group gap="xs">
                        {!isLoading && prescriptions.length > 0 && (
                            <Badge variant="light" color="gray" size="sm" radius="xl">
                                {prescriptions.length} {prescriptions.length === 1 ? "file" : "files"}
                            </Badge>
                        )}
                        <Button
                            leftSection={<IconCapsule size={15} />}
                            size="xs"
                            variant="light"
                            color="violet"
                            onClick={openAddMed}
                        >
                            Add Medication
                        </Button>
                        <Button
                            leftSection={<IconCamera size={15} />}
                            size="xs"
                            variant="filled"
                            color="primary"
                            loading={upload.isPending}
                            onClick={() => cameraInputRef.current?.click()}
                        >
                            Take Photo
                        </Button>
                        <Button
                            leftSection={<IconUpload size={15} />}
                            size="xs"
                            variant="light"
                            color="primary"
                            loading={upload.isPending}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Upload
                        </Button>
                    </Group>
                </Group>
            </Box>

            {/* Scrollable content */}
            <Box style={{ flex: 1, overflow: "hidden" }}>
                <ScrollArea style={{ height: "100%" }}>
                    <Box px={{ base: "md", sm: "xl" }} py="lg" maw={1080} mx="auto">
                        {/* Loading skeletons */}
                        {isLoading && (
                            <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }} spacing="md">
                                {["sk-a", "sk-b", "sk-c", "sk-d"].map((k) => (
                                    <Skeleton key={k} height={200} radius="lg" />
                                ))}
                            </SimpleGrid>
                        )}

                        {/* Empty state */}
                        {!isLoading && prescriptions.length === 0 && (
                            <EmptyPrescriptions
                                onCameraCapture={() => cameraInputRef.current?.click()}
                                onFileSelect={() => fileInputRef.current?.click()}
                            />
                        )}

                        {/* Grid */}
                        {!isLoading && prescriptions.length > 0 && (
                            <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4 }} spacing="md">
                                {prescriptions.map((rx) => (
                                    <PrescriptionCard
                                        key={rx.id}
                                        file={rx}
                                        isPendingDelete={
                                            deleteRx.isPending &&
                                            deleteRx.variables?.fileId === rx.id
                                        }
                                        isExtracting={extractingFileId === rx.id}
                                        onDelete={() => handleDelete(rx)}
                                        onExtract={() => handleExtract(rx)}
                                        onViewMeds={() => setDetailFileId(rx.id)}
                                    />
                                ))}
                            </SimpleGrid>
                        )}
                    </Box>
                </ScrollArea>
            </Box>
        </Box>
    );
}
