"use client";

import { Badge, Group, Paper, Stack, Text, Title } from "@mantine/core";
import type { SubmitReportInput } from "@/data/shared/service/agents/base/tools/submit-report.tool";

export interface ReportCardProps {
    data: SubmitReportInput;
}

function formatList(items?: ReadonlyArray<string>): string {
    if (!items || items.length === 0) return "—";
    return items.join(" • ");
}

function resolveHandoffTarget(data: SubmitReportInput): string | undefined {
    if (data.handoff?.nextSpecialist) return data.handoff.nextSpecialist;
    return data.suggestedNextSpecialist;
}

function resolveUrgencyColor(urgency: SubmitReportInput["urgency"]): string {
    if (urgency === "emergency") return "danger";
    if (urgency === "urgent") return "warning";
    return "success";
}

function ReportHeader({ data }: Readonly<ReportCardProps>) {
    const urgencyColor = resolveUrgencyColor(data.urgency);
    return (
        <Group justify="space-between" align="flex-start">
            <Stack gap={2}>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                    {data.reportLabel ?? "Professional Report"}
                </Text>
                <Title order={5}>{data.title}</Title>
            </Stack>
            <Group gap="xs">
                <Badge variant="light" color="secondary">{data.specialty}</Badge>
                <Badge variant="light" color="primary">{data.reportType}</Badge>
                <Badge variant="light" color={urgencyColor}>
                    {(data.urgency ?? "routine").toUpperCase()}
                </Badge>
            </Group>
        </Group>
    );
}

function ReportDetails({ data }: Readonly<ReportCardProps>) {
    const handoffTarget = resolveHandoffTarget(data);
    return (
        <>
            <Text size="sm"><Text span fw={600}>Summary: </Text>{data.summary}</Text>
            <Text size="sm"><Text span fw={600}>Findings: </Text>{data.findings}</Text>

            {data.impression ? (
                <Text size="sm"><Text span fw={600}>Impression: </Text>{data.impression}</Text>
            ) : null}

            {handoffTarget ? (
                <Text size="sm"><Text span fw={600}>Handover: </Text>{handoffTarget}</Text>
            ) : null}

            {data.recommendedFollowUp && data.recommendedFollowUp.length > 0 ? (
                <Text size="sm"><Text span fw={600}>Follow-up: </Text>{formatList(data.recommendedFollowUp)}</Text>
            ) : null}
        </>
    );
}

export function ReportCard({ data }: Readonly<ReportCardProps>) {

    return (
        <Paper withBorder radius="lg" p="md">
            <Stack gap="xs">
                <ReportHeader data={data} />
                <ReportDetails data={data} />
            </Stack>
        </Paper>
    );
}
