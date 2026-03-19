"use client";
import { Accordion, Badge, Box, Button, Card, Divider, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconAlertTriangle, IconCalendarEvent, IconCheck, IconClipboardList, IconDroplet, IconNeedle, IconPill, IconStethoscope, IconX } from "@tabler/icons-react";
import type { SubmitPrescriptionInput } from "@/data/shared/service/agents/prescription/tools/submit-prescription.tool";

// ── Helpers ───────────────────────────────────────────────────────────────────

type Medication = SubmitPrescriptionInput["medications"][number];

const FORM_ICON: Record<string, React.ReactNode> = {
    Tablet: <IconPill size={14} />,
    Capsule: <IconPill size={14} />,
    "Oral Solution": <IconDroplet size={14} />,
    Suspension: <IconDroplet size={14} />,
    Injection: <IconNeedle size={14} />,
    Syrup: <IconDroplet size={14} />,
    "Eye Drops": <IconDroplet size={14} />,
};

function formIcon(form: string) {
    return FORM_ICON[form] ?? <IconPill size={14} />;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MedControl({ med }: Readonly<{ med: Medication }>) {
    return (
        <Group gap="sm" wrap="nowrap" style={{ flex: 1 }}>
            <ThemeIcon size={24} radius="xl" variant="light" color="primary">
                {formIcon(med.form)}
            </ThemeIcon>
            <Box style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={600} truncate>
                    {med.name} {med.dosage}
                </Text>
                <Text size="xs" c="dimmed">
                    {med.form} · {med.frequency} · {med.duration}
                </Text>
            </Box>
        </Group>
    );
}

function MedDetail({ label, value }: Readonly<{ label: string; value: string }>) {
    return (
        <Group gap={6} wrap="nowrap" align="start">
            <Text size="xs" c="dimmed" fw={600} style={{ minWidth: 80 }}>
                {label}
            </Text>
            <Text size="xs">{value}</Text>
        </Group>
    );
}

function MedPanel({ med }: Readonly<{ med: Medication }>) {
    return (
        <Accordion.Item value={med.name}>
            <Accordion.Control>
                <MedControl med={med} />
            </Accordion.Control>
            <Accordion.Panel>
                <Stack gap={6}>
                    <MedDetail label="Indication" value={med.indication} />
                    <MedDetail label="Dosage" value={`${med.dosage} ${med.form}`} />
                    <MedDetail label="Frequency" value={med.frequency} />
                    <MedDetail label="Duration" value={med.duration} />
                    {med.instructions && <MedDetail label="Instructions" value={med.instructions} />}
                    {med.monitoring && <MedDetail label="Monitoring" value={med.monitoring} />}
                </Stack>
            </Accordion.Panel>
        </Accordion.Item>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

function HeaderBadge({ count }: Readonly<{ count: number }>) {
    return (
        <Group gap="sm" wrap="nowrap">
            <ThemeIcon size={32} radius="md" color="primary" variant="filled" style={{ flexShrink: 0 }}>
                <IconClipboardList size={16} />
            </ThemeIcon>
            <Box style={{ minWidth: 0 }}>
                <Text size="xs" c="primary" fw={500} style={{ lineHeight: 1, marginBottom: 1 }}>Prescription</Text>
                <Text fw={700} size="sm" style={{ lineHeight: 1.3 }}>{count} medication{count > 1 ? "s" : ""}</Text>
            </Box>
        </Group>
    );
}

function PrescriptionHeader({ data }: Readonly<{ data: SubmitPrescriptionInput }>) {
    return (
        <Card.Section withBorder p="sm" style={{
            background: "light-dark(var(--mantine-color-primary-0), var(--mantine-color-dark-8))",
        }}>
            <Group gap="sm" wrap="nowrap" justify="space-between">
                <HeaderBadge count={data.medications.length} />
                {data.urgent && (
                    <Badge color="red" variant="filled" leftSection={<IconAlertTriangle size={12} />}>Urgent</Badge>
                )}
            </Group>
        </Card.Section>
    );
}

function ApprovalActions({ approval, onApproval }: Readonly<{ approval: { id: string }; onApproval: PrescriptionCardProps["onApproval"] }>) {
    if (!onApproval) return null;
    return (
        <>
            <Divider />
            <Group gap="sm">
                <Button size="sm" color="teal" leftSection={<IconCheck size={14} />}
                    onClick={() => onApproval({ id: approval.id, approved: true })}>
                    Approve
                </Button>
                <Button size="sm" color="red" variant="outline" leftSection={<IconX size={14} />}
                    onClick={() => onApproval({ id: approval.id, approved: false, reason: "Patient declined" })}>
                    Decline
                </Button>
            </Group>
        </>
    );
}

function FooterNote({ icon, color, children }: Readonly<{ icon: React.ReactNode; color: string; children: React.ReactNode }>) {
    return (
        <Group gap={6} wrap="nowrap" align="start">
            <ThemeIcon size={20} radius="xl" color={color} variant="light">{icon}</ThemeIcon>
            <Text size="xs">{children}</Text>
        </Group>
    );
}

function PrescriptionFooter({ data, approval, onApproval }: Readonly<Pick<PrescriptionCardProps, "data" | "approval" | "onApproval">>) {
    if (!data.generalInstructions && !data.followUp && !approval) return null;
    return (
        <Card.Section p="sm" style={{
            background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))",
        }}>
            <Stack gap="xs">
                {data.generalInstructions && (
                    <FooterNote icon={<IconStethoscope size={11} />} color="teal">{data.generalInstructions}</FooterNote>
                )}
                {data.followUp && (
                    <FooterNote icon={<IconCalendarEvent size={11} />} color="primary">
                        <Text span fw={600}>Follow-up:</Text> {data.followUp}
                    </FooterNote>
                )}
                {approval && <ApprovalActions approval={approval} onApproval={onApproval} />}
            </Stack>
        </Card.Section>
    );
}

export interface PrescriptionCardProps {
    data: SubmitPrescriptionInput;
    approval?: { id: string };
    onApproval?: (opts: { id: string; approved: boolean; reason?: string }) => void;
}

export function PrescriptionCard({ data, approval, onApproval }: Readonly<PrescriptionCardProps>) {
    return (
        <Card withBorder p={0} radius="lg" style={{ overflow: "hidden" }}>
            <PrescriptionHeader data={data} />
            <Accordion multiple chevronPosition="right" defaultValue={data.medications.map((m) => m.name)}>
                {data.medications.map((med) => (
                    <MedPanel key={med.name} med={med} />
                ))}
            </Accordion>
            <PrescriptionFooter data={data} approval={approval} onApproval={onApproval} />
        </Card>
    );
}
