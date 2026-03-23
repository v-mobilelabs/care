"use client";
import { Accordion, Badge, Box, Card, Divider, Group, List, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconDroplet, IconMinus } from "@tabler/icons-react";
import type { SubmitLabReportAnalysisInput } from "@/data/shared/service/agents/lab-report/tools/submit-lab-report-analysis.tool";

// ── Status → visual config ────────────────────────────────────────────────────

type BiomarkerStatus = "normal" | "low" | "high" | "critical";

const STATUS_CONFIG: Record<BiomarkerStatus, { color: string; label: string; icon: React.ReactNode }> = {
    normal: { color: "teal", label: "Normal", icon: <IconCheck size={10} /> },
    low: { color: "yellow", label: "Low ↓", icon: <IconMinus size={10} /> },
    high: { color: "orange", label: "High ↑", icon: <IconAlertTriangle size={10} /> },
    critical: { color: "red", label: "Critical", icon: <IconAlertTriangle size={10} /> },
};

// ── Sub-components ────────────────────────────────────────────────────────────

type Finding = SubmitLabReportAnalysisInput["panels"][number]["findings"][number];

function StatusBadge({ status }: Readonly<{ status: BiomarkerStatus }>) {
    const cfg = STATUS_CONFIG[status];
    return (
        <Badge size="xs" variant="light" color={cfg.color} leftSection={cfg.icon}>
            {cfg.label}
        </Badge>
    );
}

function FindingIndicator({ finding, color }: Readonly<{ finding: Finding; color: string }>) {
    return (
        <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
            <Box style={{ width: 3, height: 24, borderRadius: 2, background: `var(--mantine-color-${color}-5)`, flexShrink: 0 }} />
            <Box style={{ minWidth: 0 }}>
                <Text size="sm" fw={600} truncate>{finding.name}</Text>
                <Text size="xs" c="dimmed" lh={1.4}>{finding.interpretation}</Text>
            </Box>
        </Group>
    );
}

function FindingValue({ finding, color }: Readonly<{ finding: Finding; color: string }>) {
    return (
        <Stack gap={2} align="flex-end" style={{ flexShrink: 0 }}>
            <Text size="sm" fw={700} c={color}>{finding.value}</Text>
            <StatusBadge status={finding.status} />
        </Stack>
    );
}

function FindingRow({ finding }: Readonly<{ finding: Finding }>) {
    const cfg = STATUS_CONFIG[finding.status];
    const bg = finding.status === "critical" ? "light-dark(var(--mantine-color-red-0), rgba(254,226,226,0.08))" : undefined;
    return (
        <Box py={4} style={{ borderRadius: "var(--mantine-radius-sm)", background: bg }}>
            <Group gap="sm" wrap="nowrap" justify="space-between">
                <FindingIndicator finding={finding} color={cfg.color} />
                <FindingValue finding={finding} color={cfg.color} />
            </Group>
        </Box>
    );
}

function PanelControl({ panel }: Readonly<{ panel: SubmitLabReportAnalysisInput["panels"][number] }>) {
    const abnormalCount = panel.findings.filter((f) => f.status !== "normal").length;
    const criticalCount = panel.findings.filter((f) => f.status === "critical").length;
    return (
        <Group gap="sm" wrap="nowrap" style={{ flex: 1 }}>
            <Text size="sm" fw={600}>{panel.panelName}</Text>
            <Box style={{ flex: 1 }} />
            <Group gap={4} wrap="nowrap">
                <Badge size="xs" variant="light" color="gray">{panel.findings.length}</Badge>
                {criticalCount > 0 && (
                    <Badge size="xs" variant="filled" color="red">{criticalCount} critical</Badge>
                )}
                {abnormalCount > 0 && criticalCount === 0 && (
                    <Badge size="xs" variant="light" color="orange">{abnormalCount} abnormal</Badge>
                )}
            </Group>
        </Group>
    );
}

function PanelSection({ panel }: Readonly<{ panel: SubmitLabReportAnalysisInput["panels"][number] }>) {
    return (
        <Accordion.Item value={panel.panelName}>
            <Accordion.Control>
                <PanelControl panel={panel} />
            </Accordion.Control>
            <Accordion.Panel>
                <Stack gap={6}>
                    {panel.findings.map((f) => (
                        <FindingRow key={f.name} finding={f} />
                    ))}
                    <Divider mt={4} mb={2} />
                    <Text size="xs" c="dimmed" fs="italic" lh={1.5}>{panel.summary}</Text>
                </Stack>
            </Accordion.Panel>
        </Accordion.Item>
    );
}

function HeaderBadge({ data }: Readonly<{ data: SubmitLabReportAnalysisInput }>) {
    const totalFindings = data.panels.reduce((sum, p) => sum + p.findings.length, 0);
    const criticalCount = data.criticalFindings?.length ?? 0;
    return (
        <Group gap="xs" wrap="nowrap">
            <ThemeIcon size={32} radius="md" color={criticalCount > 0 ? "red" : "primary"} variant="filled" style={{ flexShrink: 0 }}>
                <IconDroplet size={16} />
            </ThemeIcon>
            <Box style={{ minWidth: 0 }}>
                <Text size="xs" c={criticalCount > 0 ? "red" : "primary"} fw={500} style={{ lineHeight: 1, marginBottom: 1 }}>
                    Lab Report Analysis
                </Text>
                <Text fw={700} size="sm" style={{ lineHeight: 1.3 }}>
                    {data.panels.length} panel{data.panels.length > 1 ? "s" : ""} · {totalFindings} biomarker{totalFindings > 1 ? "s" : ""}
                </Text>
            </Box>
        </Group>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

function CriticalFindingsHeader() {
    return (
        <Group gap={6} mb={4}>
            <ThemeIcon size={18} radius="xl" color="red" variant="light"><IconAlertTriangle size={10} /></ThemeIcon>
            <Text size="xs" fw={700} c="red">Needs Attention</Text>
        </Group>
    );
}

const CRITICAL_DOT = <Box style={{ width: 6, height: 6, borderRadius: 3, background: "var(--mantine-color-red-5)", marginTop: 6 }} />;

function CriticalFindingsSection({ findings }: Readonly<{ findings: string[] }>) {
    if (findings.length === 0) return null;
    return (
        <Card.Section px="sm" py="sm" m="0" style={{
            background: "light-dark(var(--mantine-color-red-0), rgba(254,226,226,0.06))",
            borderBottom: "1px solid light-dark(var(--mantine-color-red-2), var(--mantine-color-dark-4))",
        }}>
            <CriticalFindingsHeader />
            <List size="xs" spacing={4} icon={CRITICAL_DOT}>
                {findings.map((finding) => (
                    <List.Item key={finding}><Text size="xs" c="red.7">{finding}</Text></List.Item>
                ))}
            </List>
        </Card.Section>
    );
}

function RecommendationsList({ items }: Readonly<{ items: string[] }>) {
    if (items.length === 0) return null;
    return (
        <>
            <Text pb="sm" size="xs" fw={700} c="dimmed" style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>Recommendations</Text>
            <List size="xs" spacing={4} icon={
                <Box style={{ width: 16, height: 16, borderRadius: 8, background: "light-dark(rgba(16,185,129,0.1), rgba(16,185,129,0.15))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <IconCheck size={10} color="var(--mantine-color-teal-5)" />
                </Box>
            }>
                {items.map((rec) => (
                    <List.Item key={rec}><Text size="xs">{rec}</Text></List.Item>
                ))}
            </List>
        </>
    );
}

function AssessmentFooter({ data }: Readonly<{ data: SubmitLabReportAnalysisInput }>) {
    return (
        <>
            <Card.Section withBorder p="sm" m="0">
                <Text size="sm" lh={1.5}>{data.overallAssessment}</Text>
            </Card.Section>
            <Card.Section p="sm" m="0">
                <RecommendationsList items={data.recommendations ?? []} />
            </Card.Section>
        </>
    );
}

export function LabReportAnalysisCard({ data }: Readonly<{ data: SubmitLabReportAnalysisInput }>) {
    const criticalFindings = data.criticalFindings ?? [];
    const headerBg = criticalFindings.length > 0
        ? "light-dark(var(--mantine-color-red-0), var(--mantine-color-dark-8))"
        : "light-dark(var(--mantine-color-primary-0), var(--mantine-color-dark-8))";

    return (
        <Card withBorder p={0} radius="lg" style={{ overflow: "hidden" }}>
            <Card.Section withBorder p="sm" m="0" style={{ background: headerBg }}>
                <HeaderBadge data={data} />
            </Card.Section>
            <CriticalFindingsSection findings={criticalFindings} />
            <Accordion multiple defaultValue={data.panels.map((p) => p.panelName)} chevronPosition="right">
                {data.panels.map((panel) => <PanelSection key={panel.panelName} panel={panel} />)}
            </Accordion>
            <AssessmentFooter data={data} />
        </Card>
    );
}
