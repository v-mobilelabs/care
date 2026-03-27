"use client";
import { useState, type ReactNode } from "react";
import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Container,
    Divider,
    Group,
    Paper,
    Skeleton,
    Stack,
    Text,
    ThemeIcon,
    Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
    IconArrowLeft,
    IconCalendar,
    IconCapsule,
    IconCheck,
    IconExternalLink,
    IconMessage,
    IconReportMedical,
    IconSparkles,
    IconTrash,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import {
    usePrescriptionQuery,
    useDeletePrescriptionMutation,
    useExtractPrescriptionMutation,
    useAddMedicationMutation,
    type PrescriptionRecord,
} from "@/app/(portal)/user/_query";
import { colors } from "@/ui/tokens";
import { DateText } from "@/ui/DateText";
import Link from "@/ui/link";
import { trackEvent } from "@/lib/analytics";
import { MedRow } from "../_med-row";

function formatPrescriptionDate(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString("en-GB");
    } catch {
        return dateStr;
    }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DetailSkeleton() {
    return (
        <Container pt="md" pb="xl" size="md">
            <Stack gap="md">
                <Group gap="sm" align="center">
                    <Skeleton circle h={32} w={32} />
                    <Skeleton h={22} w={220} radius="sm" />
                </Group>
                <DetailSkeletonCard />
            </Stack>
        </Container>
    );
}
function getPrescriptionSourceExplanation(record: PrescriptionRecord): string {
    if (record.source === "extracted") {
        return "This record was created from an uploaded prescription file. Review the extracted medication details against the original document before acting on them.";
    }

    return "This record was generated during a care conversation in the portal. Treat it as guided follow-up information and confirm anything important with your clinician when needed.";
}

function getPrescriptionNextStep(record: PrescriptionRecord): string {
    if (record.medications.length === 0) {
        return "Extract the prescription first so the portal can structure the medication details and help you reuse them later.";
    }

    if (record.followUp) {
        return `Review the follow-up note and medication list together: ${record.followUp}`;
    }

    if (record.sessionId) {
        return "Open the linked conversation if you want to continue asking questions with the same prescription context attached.";
    }

    return "Review each medication carefully, then add it to My Medications only if the details match your prescription.";
}

function getPrescriptionUrgencyNote(record: PrescriptionRecord): string {
    if (record.urgent) {
        return "This prescription was marked urgent, which means the portal identified it as needing quicker attention or follow-up.";
    }

    return "This record is not marked urgent, but you should still use your symptoms and clinician advice to decide how quickly to act.";
}

function DetailSkeletonCard() {
    return (
        <Paper withBorder radius="md" p="md">
            <Stack gap="sm">
                <Group gap={6}>
                    <Skeleton h={22} w={120} radius="xl" />
                    <Skeleton h={22} w={110} radius="xl" />
                    <Skeleton h={22} w={130} radius="xl" />
                </Group>
                <Skeleton h={14} w="75%" />
                <Skeleton h={14} w="60%" />
                <Divider />
                <DetailSkeletonRows />
            </Stack>
        </Paper>
    );
}

function DetailSkeletonRows() {
    return (
        <Stack gap="sm">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} h={72} radius="md" />)}
        </Stack>
    );
}

function DetailCardMain({ record, meds, isExtracting, handleExtract, allAdded, isAddingAll, handleAddAll }: Readonly<{
    record: PrescriptionRecord;
    meds: PrescriptionRecord["medications"];
    isExtracting: boolean;
    handleExtract: () => void;
    allAdded: boolean;
    isAddingAll: boolean;
    handleAddAll: () => Promise<void>;
}>) {
    return (
        <>
            <MetaBadges record={record} medCount={meds.length} />
            <PrescriptionExplainer record={record} />
            <NotesSection record={record} />
            <MedsOrExtract record={record} meds={meds} isExtracting={isExtracting}
                handleExtract={handleExtract} allAdded={allAdded} isAddingAll={isAddingAll} handleAddAll={handleAddAll} />
        </>
    );
}

function DetailContentCard({ record, meds, isExtracting, handleExtract, handleDelete, allAdded, isAddingAll, handleAddAll }: Readonly<{ record: PrescriptionRecord; meds: PrescriptionRecord["medications"]; isExtracting: boolean; handleExtract: () => void; handleDelete: () => void; allAdded: boolean; isAddingAll: boolean; handleAddAll: () => Promise<void>; }>) {
    return (
        <Paper withBorder radius="md" p="md">
            <Stack gap="md">
                <DetailCardMain record={record} meds={meds} isExtracting={isExtracting}
                    handleExtract={handleExtract} allAdded={allAdded} isAddingAll={isAddingAll} handleAddAll={handleAddAll} />
                <ActionBar record={record} isExtracting={isExtracting} onExtract={handleExtract} onDelete={handleDelete} />
            </Stack>
        </Paper>
    );
}

function NotFoundState({ onBack }: Readonly<{ onBack: () => void }>) {
    return (
        <Container pt="xl" pb="xl" size="md" style={{ textAlign: "center" }}>
            <ThemeIcon size={48} radius="xl" variant="light" color="gray" mx="auto" mb="md">
                <IconReportMedical size={24} />
            </ThemeIcon>
            <Text fw={500}>Prescription not found</Text>
            <Button variant="light" mt="md" onClick={onBack}>Back to Prescriptions</Button>
        </Container>
    );
}

function DetailHeader({ record, onBack }: Readonly<{ record: PrescriptionRecord; onBack: () => void }>) {
    const displayName = record.prescribedBy ? `Dr. ${record.prescribedBy}` : "Prescription";
    return (
        <Group gap="sm" align="center">
            <ActionIcon variant="subtle" color="gray" size="lg" onClick={onBack} aria-label="Back">
                <IconArrowLeft size={18} />
            </ActionIcon>
            <ThemeIcon size={32} radius="md" variant="light" color="primary">
                <IconReportMedical size={17} />
            </ThemeIcon>
            <Box style={{ flex: 1, minWidth: 0 }}>
                <Text fw={600} size="lg" truncate="end" lh={1.3}>{displayName}</Text>
                {record.prescriptionDate && (
                    <Text size="xs" c="dimmed">{formatPrescriptionDate(record.prescriptionDate)}</Text>
                )}
            </Box>
        </Group>
    );
}

function PrescriptionExplainer({ record }: Readonly<{ record: PrescriptionRecord }>) {
    return (
        <Paper
            withBorder
            radius="md"
            p="sm"
            style={{ background: "light-dark(var(--mantine-color-gray-0), rgba(255, 255, 255, 0.02))" }}
        >
            <Stack gap="xs">
                <Box>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                        What this means
                    </Text>
                    <Text size="sm">{getPrescriptionSourceExplanation(record)}</Text>
                </Box>

                <Box>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                        Urgency and follow-up
                    </Text>
                    <Text size="sm">{getPrescriptionUrgencyNote(record)}</Text>
                </Box>

                <Box>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                        Suggested next step
                    </Text>
                    <Text size="sm">{getPrescriptionNextStep(record)}</Text>
                </Box>

                {record.sessionId ? (
                    <Group>
                        <Link href={`/user/assistant?id=${record.sessionId}`}>
                            <Button
                                size="xs"
                                variant="light"
                                color="primary"
                                leftSection={<IconMessage size={14} />}
                                onClick={() => {
                                    trackEvent({
                                        name: "health_record_viewed",
                                        params: {
                                            action: "open_linked_session",
                                            surface: "prescription_detail",
                                            session_id: record.sessionId,
                                            prescription_id: record.id,
                                        },
                                    });
                                }}
                            >
                                Open linked session
                            </Button>
                        </Link>
                    </Group>
                ) : null}
            </Stack>
        </Paper>
    );
}

function MetaBadges({ record, medCount }: Readonly<{ record: PrescriptionRecord; medCount: number }>) {
    return (
        <Group gap={6}>
            {record.prescriptionDate && (
                <Badge variant="light" color="gray" size="sm" radius="sm" leftSection={<IconCalendar size={11} />}>
                    {formatPrescriptionDate(record.prescriptionDate)}
                </Badge>
            )}
            {record.source === "generated" && <Badge variant="light" color="primary" size="sm">AI Generated</Badge>}
            {record.urgent && <Badge variant="filled" color="red" size="sm">Urgent</Badge>}
            {medCount > 0 && (
                <Badge variant="light" color={colors.success} size="sm" leftSection={<IconCapsule size={11} />}>
                    {medCount} medication{medCount === 1 ? "" : "s"}
                </Badge>
            )}
        </Group>
    );
}

function NotesSection({ record }: Readonly<{ record: PrescriptionRecord }>) {
    if (!record.generalInstructions && !record.notes && !record.followUp) return null;
    return (
        <Stack gap={4}>
            {record.generalInstructions && <Text size="sm" c="dimmed">{record.generalInstructions}</Text>}
            {record.notes && <Text size="sm" c="dimmed" style={{ fontStyle: "italic" }}>{record.notes}</Text>}
            {record.followUp && <Text size="sm" c="dimmed">Follow-up: {record.followUp}</Text>}
        </Stack>
    );
}

function SourceLink({ fileUrl }: Readonly<{ fileUrl: string }>) {
    return (
        <Button component="a" href={fileUrl} target="_blank" rel="noopener noreferrer"
            leftSection={<IconExternalLink size={14} />} variant="subtle" color="gray" size="xs">
            View source
        </Button>
    );
}

function UnextractedState({ fileUrl, isExtracting, onExtract }: Readonly<{
    fileUrl?: string; isExtracting: boolean; onExtract: () => void;
}>) {
    return (
        <Stack align="center" gap="md" py="xl">
            <ThemeIcon size={56} radius="xl" color="primary" variant="light"><IconSparkles size={28} /></ThemeIcon>
            <Box ta="center">
                <Text fw={600} size="sm">No medications extracted yet</Text>
                <Text size="xs" c="dimmed" mt={4}>Extract with AI to read medication details.</Text>
            </Box>
            {fileUrl && <SourceLink fileUrl={fileUrl} />}
            <Button leftSection={<IconSparkles size={15} />} color="primary"
                loading={isExtracting} disabled={isExtracting} onClick={onExtract} size="md">
                Extract with AI
            </Button>
        </Stack>
    );
}

function MedicationsList({ record, allAdded, isAddingAll, onAddAll }: Readonly<{
    record: PrescriptionRecord; allAdded: boolean; isAddingAll: boolean; onAddAll: () => void;
}>) {
    const meds = record.medications;
    return (
        <>
            <Divider label={`Medications (${meds.length})`} labelPosition="left" />
            <Stack gap="sm">
                {meds.map((med) => <MedRow key={med.name} med={med} />)}
            </Stack>
            <Button leftSection={<IconCapsule size={15} />} color="primary" variant="light"
                loading={isAddingAll} disabled={allAdded} onClick={onAddAll} fullWidth>
                {allAdded ? "All added" : `Add all ${meds.length} to My Medications`}
            </Button>
        </>
    );
}

function ActionButtons({ record, isExtracting, onExtract, onDelete }: Readonly<{
    record: PrescriptionRecord; isExtracting: boolean; onExtract: () => void; onDelete: () => void;
}>) {
    const hasMeds = record.medications.length > 0;
    return (
        <Group gap="xs" wrap="wrap">
            {record.fileUrl && <SourceLink fileUrl={record.fileUrl} />}
            <Tooltip label={hasMeds ? "Re-extract with AI" : "Extract with AI"}>
                <Button variant="light" color="primary" size="xs"
                    leftSection={<IconSparkles size={14} />} loading={isExtracting} onClick={onExtract}>
                    {hasMeds ? "Re-extract" : "Extract"}
                </Button>
            </Tooltip>
            <Button variant="light" color="red" size="xs"
                leftSection={<IconTrash size={14} />} onClick={onDelete}>Delete</Button>
        </Group>
    );
}

function ActionBar({ record, isExtracting, onExtract, onDelete }: Readonly<{
    record: PrescriptionRecord; isExtracting: boolean; onExtract: () => void; onDelete: () => void;
}>) {
    return (
        <>
            <Divider />
            <Stack gap={6}>
                <ActionButtons record={record} isExtracting={isExtracting}
                    onExtract={onExtract} onDelete={onDelete} />
                <Text size="xs" c="dimmed" ta="right">Added <DateText date={record.createdAt} /></Text>
            </Stack>
        </>
    );
}

// ── Handlers hook ─────────────────────────────────────────────────────────────

function showSuccess(message: string) {
    notifications.show({ message, color: colors.success, icon: <IconCheck size={16} /> });
}

function useDeleteHandler(record: PrescriptionRecord | null | undefined, goBack: () => void) {
    const deleteRx = useDeletePrescriptionMutation();
    return () => {
        if (!record) return;
        const label = record.prescribedBy ? `Dr. ${record.prescribedBy}` : "This prescription";
        modals.openConfirmModal({
            title: "Delete prescription?",
            children: <Text size="sm"><strong>{label}</strong> will be permanently removed.</Text>,
            labels: { confirm: "Delete", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => deleteRx.mutate({ prescriptionId: record.id }, {
                onSuccess: () => { showSuccess(`${label} deleted.`); goBack(); },
            }),
        });
    };
}

function onExtractSuccess(result: { medications: unknown[] }) {
    const count = result.medications.length;
    let message = "No medications found.";
    let color = "gray";
    let icon: ReactNode;

    if (count > 0) {
        message = `${count} medication${count === 1 ? "" : "s"} extracted.`;
        color = colors.success;
        icon = <IconCheck size={16} />;
    }

    notifications.show({
        message,
        color,
        icon,
    });
}

function useExtractHandler(record: PrescriptionRecord | null | undefined) {
    const extract = useExtractPrescriptionMutation();
    const [isExtracting, setIsExtracting] = useState(false);
    const handleExtract = () => {
        if (!record) return;
        setIsExtracting(true);
        extract.mutate({ fileId: record.id }, {
            onSuccess: (result) => { setIsExtracting(false); onExtractSuccess(result); },
            onError: (err) => {
                setIsExtracting(false);
                notifications.show({
                    title: "Extraction failed",
                    message: err instanceof Error ? err.message : "Could not extract prescription data.",
                    color: colors.danger,
                });
            },
        });
    };
    return { isExtracting, handleExtract };
}

function useAddAllHandler(meds: PrescriptionRecord["medications"]) {
    const addMed = useAddMedicationMutation();
    const [allAdded, setAllAdded] = useState(false);
    const handleAddAll = async () => {
        for (const med of meds) {
            await addMed.mutateAsync({
                name: med.name, dosage: med.dosage, form: med.form, frequency: med.frequency,
                duration: med.duration, instructions: med.instructions, condition: med.indication, status: "active",
            });
        }
        setAllAdded(true);
        notifications.show({
            message: `${meds.length} medication${meds.length === 1 ? "" : "s"} added to My Medications.`,
            color: colors.success, icon: <IconCheck size={16} />,
        });
    };
    return { allAdded, isAddingAll: addMed.isPending, handleAddAll };
}

// ── Main Component ────────────────────────────────────────────────────────────

function MedsOrExtract({ record, meds, isExtracting, handleExtract, allAdded, isAddingAll, handleAddAll }: Readonly<{
    record: PrescriptionRecord; meds: PrescriptionRecord["medications"];
    isExtracting: boolean; handleExtract: () => void;
    allAdded: boolean; isAddingAll: boolean; handleAddAll: () => Promise<void>;
}>) {
    if (!meds.length) {
        return <UnextractedState fileUrl={record.fileUrl} isExtracting={isExtracting} onExtract={handleExtract} />;
    }
    return (
        <MedicationsList record={record} allAdded={allAdded}
            isAddingAll={isAddingAll} onAddAll={() => { void handleAddAll(); }} />
    );
}

function DetailBody({ record, meds, isExtracting, handleExtract, handleDelete, allAdded, isAddingAll, handleAddAll, goBack }: Readonly<{
    record: PrescriptionRecord; meds: PrescriptionRecord["medications"];
    isExtracting: boolean; handleExtract: () => void; handleDelete: () => void;
    allAdded: boolean; isAddingAll: boolean; handleAddAll: () => Promise<void>; goBack: () => void;
}>) {
    return (
        <Container pt="md" pb="xl" size="md">
            <Stack gap="md">
                <DetailHeader record={record} onBack={goBack} />
                <DetailContentCard record={record} meds={meds} isExtracting={isExtracting}
                    handleExtract={handleExtract} handleDelete={handleDelete} allAdded={allAdded}
                    isAddingAll={isAddingAll} handleAddAll={handleAddAll} />
            </Stack>
        </Container>
    );
}

export function PrescriptionDetailContent({ prescriptionId }: Readonly<{ prescriptionId: string }>) {
    const router = useRouter();
    const { data: record, isLoading } = usePrescriptionQuery(prescriptionId);
    const meds = record?.medications ?? [];
    const goBack = () => router.push("/user/prescriptions");
    const handleDelete = useDeleteHandler(record, goBack);
    const { isExtracting, handleExtract } = useExtractHandler(record);
    const { allAdded, isAddingAll, handleAddAll } = useAddAllHandler(meds);

    if (isLoading) return <DetailSkeleton />;
    if (!record) return <NotFoundState onBack={goBack} />;

    return (
        <DetailBody record={record} meds={meds} isExtracting={isExtracting}
            handleExtract={handleExtract} handleDelete={handleDelete} allAdded={allAdded}
            isAddingAll={isAddingAll} handleAddAll={handleAddAll} goBack={goBack} />
    );
}
