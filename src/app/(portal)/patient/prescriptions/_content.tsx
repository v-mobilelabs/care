"use client";
import { ActionIcon, Badge, Box, Button, Card, Container, Group, ScrollArea, SimpleGrid, Skeleton, Text, ThemeIcon, Title, Tooltip } from "@mantine/core";
import { useRef, useState } from "react";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconCamera, IconCheck, IconReportMedical, IconUpload } from "@tabler/icons-react";

import {
    usePrescriptionsQuery,
    useUploadPrescriptionMutation,
    useDeletePrescriptionMutation,
    useExtractPrescriptionMutation,
    type PrescriptionRecord,
} from "@/app/(portal)/patient/_query";
import { colors } from "@/ui/tokens";
import { PrescriptionDetailDrawer } from "./_prescription-detail-drawer";
import { PrescriptionCard } from "./_prescription-card";
import { EmptyPrescriptions } from "./_empty-prescriptions";

// ── Main content ──────────────────────────────────────────────────────────────

export function PrescriptionsContent() {
    const { data: prescriptions = [], isLoading } = usePrescriptionsQuery();
    const upload = useUploadPrescriptionMutation();
    const deleteRx = useDeletePrescriptionMutation();
    const extract = useExtractPrescriptionMutation();

    const cameraInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [extractingFileId, setExtractingFileId] = useState<string | null>(null);
    const [detailFileId, setDetailFileId] = useState<string | null>(null);
    const detailFile = prescriptions.find((f) => f.id === detailFileId) ?? null;

    function handleFiles(files: FileList | null) {
        if (!files || files.length === 0) return;
        Array.from(files).forEach((file) => {
            upload.mutate({ file }, {
                onSuccess: (result) => {
                    const count = result.medications.length;
                    notifications.show({
                        message: count > 0
                            ? `${file.name} saved — ${count} medication${count === 1 ? "" : "s"} extracted.`
                            : `${file.name} saved.`,
                        color: colors.success,
                        icon: <IconCheck size={16} />,
                    });
                    if (count > 0) setDetailFileId(result.id);
                },
                onError: (err) =>
                    notifications.show({
                        title: "Upload failed",
                        message: err instanceof Error ? err.message : "Unknown error",
                        color: colors.danger,
                    }),
            });
        });
    }

    function handleExtract(file: PrescriptionRecord) {
        setExtractingFileId(file.id);
        extract.mutate({ fileId: file.id }, {
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

    function handleDelete(file: PrescriptionRecord) {
        const label = file.prescribedBy ? `Dr. ${file.prescribedBy}` : "This prescription";
        modals.openConfirmModal({
            title: "Delete prescription?",
            children: (
                <Text size="sm">
                    <strong>{label}</strong> will be permanently removed. This cannot be undone.
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
                                message: `${label} deleted.`,
                                color: colors.success,
                                icon: <IconCheck size={16} />,
                            }),
                    },
                );
            },
        });
    }

    return (
        <Container pt="md">
            {/* Detail modal — key resets state when switching between prescriptions */}
            <PrescriptionDetailDrawer
                key={detailFileId ?? ""}
                file={detailFile}
                isExtracting={extractingFileId === detailFileId}
                onExtract={() => { if (detailFile) handleExtract(detailFile); }}
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
            <Card
                radius={"xl"}
                withBorder
            >
                <Card.Section bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))" px="md" py="md" withBorder>
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
                            {/* Mobile: Icon-only buttons */}
                            <Tooltip label="Take Photo" withArrow hiddenFrom="sm">
                                <ActionIcon
                                    size={32}
                                    variant="filled"
                                    color="primary"
                                    loading={upload.isPending}
                                    onClick={() => cameraInputRef.current?.click()}
                                    hiddenFrom="sm"
                                    aria-label="Take Photo"
                                >
                                    <IconCamera size={16} />
                                </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Upload" withArrow hiddenFrom="sm">
                                <ActionIcon
                                    size={32}
                                    variant="light"
                                    color="primary"
                                    loading={upload.isPending}
                                    onClick={() => fileInputRef.current?.click()}
                                    hiddenFrom="sm"
                                    aria-label="Upload"
                                >
                                    <IconUpload size={16} />
                                </ActionIcon>
                            </Tooltip>
                            {/* Desktop: Full buttons with text */}
                            <Button
                                leftSection={<IconCamera size={15} />}
                                size="xs"
                                variant="filled"
                                color="primary"
                                loading={upload.isPending}
                                onClick={() => cameraInputRef.current?.click()}
                                visibleFrom="sm"
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
                                visibleFrom="sm"
                            >
                                Upload
                            </Button>
                        </Group>
                    </Group>
                </Card.Section>
                <Card.Section p="md">
                    {/* Scrollable content */}
                    <Box style={{ flex: 1, overflow: "hidden" }}>
                        <ScrollArea style={{ height: "100%" }}>
                            <Box maw={1080} mx="auto">
                                {/* Loading skeletons */}
                                {isLoading && (
                                    <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, lg: 4 }} spacing="md">
                                        {["sk-a", "sk-b", "sk-c", "sk-d"].map((k) => (
                                            <Skeleton key={k} height={140} radius="md" />
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
                                    <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, lg: 4 }} spacing="md">
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
                                                onOpenDetail={() => setDetailFileId(rx.id)}
                                            />
                                        ))}
                                    </SimpleGrid>
                                )}
                            </Box>
                        </ScrollArea>
                    </Box>
                </Card.Section>
            </Card>
        </Container>
    );
}
