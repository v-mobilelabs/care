"use client";
import { Button, Group, Loader, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconExclamationCircle } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import type { ReactElement } from "react";
import type { UIMessagePart, UIDataTypes, UITools } from "ai";
import { isToolPart, getToolPartName, getToolPartState, extractToolInput, extractToolOutput } from "@/ui/ai/types";
import type { AskQuestionInput, StartAssessmentInput } from "@/ui/ai/types";
import { ActionCardCard } from "./action-card";
import { AssessmentPrefaceCard } from "./assessment-preface-card";
import { ApprovalCard } from "./approval-card";
import { DietDayCard } from "./diet-day-card";
import { PrescriptionCard } from "./prescription-card";
import { QuestionCard } from "./question-card";
import { ReportCard } from "./report-card";
import { ReferralCard } from "./referral-card";
import type { ActionCardInput } from "@/data/shared/service/agents/base/tools/action-card.tool";
import type { EnhancedDietDay } from "@/data/diet-plans/models/nutrition.model";
import type { SubmitPrescriptionInput } from "@/data/shared/service/agents/prescription/tools/submit-prescription.tool";
import type { SubmitReportInput } from "@/data/shared/service/agents/base/tools/submit-report.tool";
import type { SubmitReferralRequestInput } from "@/data/shared/service/agents/base/tools/submit-referral-request.tool";
import { confirmReferral, dismissReferral } from "@/data/referrals/actions";
import { trackEvent } from "@/lib/analytics";
import { buildReferralContinuationMessage } from "@/lib/build-referral-continuation-message";
import { colors } from "@/ui/tokens";
import Link from "@/ui/link";


// ── Friendly tool name mapping ────────────────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
    startAssessment: "Preparing assessment…",
    recordCondition: "Recording condition…",
    generatePrescription: "Preparing prescription…",
    submitPrescription: "Preparing prescription…",
};

// ── Tool Part Dispatcher ──────────────────────────────────────────────────────

export interface ToolPartRendererProps {
    part: UIMessagePart<UIDataTypes, UITools>;
    onAnswer: (toolCallId: string, answer: string) => void;
    onApproval: (opts: { id: string; approved: boolean; reason?: string }) => void;
    answeredIds: ReadonlyMap<string, string>;
    isLoading: boolean;
    onLearnMore?: (text: string) => void;
    sessionId?: string;
    onSendReferralMessage?: (text: string) => Promise<void>;
}

function ToolErrorCard({ toolName }: Readonly<{ toolName: string | null }>) {
    return (
        <Paper withBorder radius="lg" p="md" style={{ borderColor: "var(--mantine-color-red-4)" }}>
            <Group gap="xs">
                <ThemeIcon size={28} radius="md" color="red" variant="light"><IconExclamationCircle size={15} /></ThemeIcon>
                <Text size="sm" c="red">Failed to process{toolName ? ` (${toolName})` : ""}. Please try again.</Text>
            </Group>
        </Paper>
    );
}

function ToolStreamingCard({ toolName }: Readonly<{ toolName: string | null }>) {
    const label = toolName === "askQuestion" ? "Preparing question…" : (TOOL_LABELS[toolName ?? ""] ?? "Processing…");
    return (
        <Paper withBorder radius="lg" p="md">
            <Group gap="xs"><Loader size={16} color="primary" /><Text size="sm" c="dimmed" fw={500}>{label}</Text></Group>
        </Paper>
    );
}

function renderApproval(part: UIMessagePart<UIDataTypes, UITools>, toolName: string | null, onApproval: ToolPartRendererProps["onApproval"]) {
    const approval = (part as unknown as { approval?: { id: string } }).approval;
    const input = (part as unknown as { input?: unknown }).input;
    if (!approval) return null;

    if (toolName === "submitPrescription" && input && typeof input === "object" && "medications" in input) {
        return <PrescriptionCard data={input as SubmitPrescriptionInput} approval={approval} onApproval={onApproval} />;
    }

    return <ApprovalCard approval={approval} input={input} onApproval={onApproval} />;
}

// ── Helper functions for referral handling ────────────────────────────────────

function showReferralConfirmedNotification(targetSpecialist: string): void {
    notifications.show({
        title: "Confirmed",
        message: `Connecting to ${targetSpecialist} specialist...`,
        color: colors.success,
    });
}

function showErrorNotification(error?: string): void {
    notifications.show({
        title: "Error",
        message: error || "An operation failed",
        color: colors.danger,
    });
}

function showSessionClosedNotification(): void {
    notifications.show({
        title: "Thank You",
        message: "Session closed. Thank you for using CareAI.",
        color: colors.success,
    });
}

async function executeReferralAction<T extends { ok: boolean; error?: string }>(
    action: () => Promise<T>,
    onSuccess: () => void,
    onError?: (err?: string) => void,
    setLoading?: (loading: boolean) => void,
): Promise<void> {
    setLoading?.(true);
    try {
        const result = await action();
        if (result.ok) onSuccess();
        else (onError || showErrorNotification)(result.error);
    } catch {
        (onError || showErrorNotification)("Unexpected error");
    } finally {
        setLoading?.(false);
    }
}

type ReferralConfirmOptions = Readonly<{
    sessionId?: string;
    specialist: string;
    reason?: string;
    reportLabel?: string;
    setReferralLoading: (loading: boolean) => void;
    onSendMessage?: (text: string) => Promise<void>;
}>;

async function handleReferralConfirm(opts: ReferralConfirmOptions): Promise<void> {
    const { sessionId, specialist, reason, reportLabel, setReferralLoading, onSendMessage } = opts;
    if (sessionId === undefined) {
        showErrorNotification("Session ID missing");
        return;
    }
    await executeReferralAction(
        () => confirmReferral(sessionId, specialist, reason ?? "", reportLabel),
        async () => {
            trackEvent({
                name: "encounter_escalated",
                params: { reason: reason ?? undefined, agent_type: specialist, session_id: sessionId },
            });
            showReferralConfirmedNotification(specialist);
            // Auto-send clinically-rich message so specialist agent starts consultation
            try {
                const msg = buildReferralContinuationMessage(specialist, reason, reportLabel);
                await onSendMessage?.(msg);
            } catch {
                // Silently fail — referral was already confirmed
            }
        },
        showErrorNotification,
        setReferralLoading,
    );
}

async function handleReferralThankYou(
    sessionId: string | undefined,
    specialist: string,
    reason: string | undefined,
    reportLabel: string | undefined,
    setReferralLoading: (loading: boolean) => void,
): Promise<void> {
    if (!sessionId) {
        showErrorNotification("Session ID missing");
        return;
    }
    await executeReferralAction(
        () => dismissReferral(sessionId, specialist, reason ?? "", reportLabel),
        showSessionClosedNotification,
        showErrorNotification,
        setReferralLoading,
    );
}

function renderReferralPart(
    part: UIMessagePart<UIDataTypes, UITools>,
    sessionId: string | undefined,
    onSendReferralMessage: ((text: string) => Promise<void>) | undefined,
    referralLoading: boolean,
    setReferralLoading: (loading: boolean) => void,
): ReactElement | null {
    const referral = extractToolInput<SubmitReferralRequestInput>(part, "submitReferralRequest");
    if (!referral?.nextSpecialist) return null;

    return (
        <ReferralCard
            data={referral}
            onConfirm={async () => {
                await handleReferralConfirm({
                    sessionId,
                    specialist: referral.nextSpecialist,
                    reason: referral.reason,
                    reportLabel: referral.reportLabel,
                    setReferralLoading,
                    onSendMessage: onSendReferralMessage,
                });
            }}
            onThankYou={async () => {
                await handleReferralThankYou(sessionId, referral.nextSpecialist, referral.reason, referral.reportLabel, setReferralLoading);
            }}
            isLoading={referralLoading}
        />
    );
}

function renderDisplayOnlyTool(part: UIMessagePart<UIDataTypes, UITools>): ReactElement | null {
    const actionCardData = extractToolInput<ActionCardInput>(part, "actionCard");
    if (actionCardData) return <ActionCardCard data={actionCardData} />;

    const dietDay = extractToolInput<EnhancedDietDay>(part, "submitDailyPlan");
    if (dietDay?.meals && dietDay?.dailyTotals) return <DietDayCard data={dietDay} />;

    const prescription = extractToolInput<SubmitPrescriptionInput>(part, "submitPrescription");
    if (prescription?.medications) return <PrescriptionCard data={prescription} />;

    const report = extractToolInput<SubmitReportInput>(part, "submitReport");
    if (report?.specialty && report?.reportType && report?.title) return <ReportCard data={report} />;

    return null;
}

type OutcomeLink = Readonly<{
    href: string;
    label: string;
}>;

function getOutcomeLink(part: UIMessagePart<UIDataTypes, UITools>): OutcomeLink | null {
    const toolName = getToolPartName(part);

    if (toolName === "submitPrescription") {
        const output = extractToolOutput<{ prescriptionId?: string }>(part, "submitPrescription");
        if (output?.prescriptionId) {
            return {
                href: `/user/health/prescriptions/${output.prescriptionId}`,
                label: "Open saved prescription",
            };
        }

        return {
            href: "/user/health/prescriptions",
            label: "View prescriptions",
        };
    }

    if (toolName === "submitReport") {
        return {
            href: "/user/health/summary",
            label: "View summary records",
        };
    }

    if (toolName === "startAssessment") {
        return {
            href: "/user/health/assessments",
            label: "Open assessments",
        };
    }

    if (toolName === "submitReferralRequest") {
        return {
            href: "/user/referrals",
            label: "Review referrals",
        };
    }

    return null;
}

function withOutcomeLink(
    part: UIMessagePart<UIDataTypes, UITools>,
    card: ReactElement | null,
): ReactElement | null {
    if (card === null) {
        return null;
    }

    const outcomeLink = getOutcomeLink(part);
    if (outcomeLink === null) {
        return card;
    }

    return (
        <Stack gap="xs">
            {card}
            <Paper withBorder radius="md" p="xs">
                <Group justify="space-between" align="center" wrap="nowrap">
                    <Text size="xs" c="dimmed">Saved to your records for future follow-up</Text>
                    <Button component={Link} href={outcomeLink.href} size="xs" variant="light" color="primary">
                        {outcomeLink.label}
                    </Button>
                </Group>
            </Paper>
        </Stack>
    );
}

type InteractiveToolRenderOptions = Readonly<{
    part: UIMessagePart<UIDataTypes, UITools>;
    state: string | null;
    toolName: string | null;
    toolCallId: string;
    answeredIds: ReadonlyMap<string, string>;
    isLoading: boolean;
    onAnswer: ToolPartRendererProps["onAnswer"];
    onApproval: ToolPartRendererProps["onApproval"];
}>;

function renderInteractiveTool(opts: InteractiveToolRenderOptions): ReactElement | null {
    const { part, state, toolName, toolCallId, answeredIds, isLoading, onAnswer, onApproval } = opts;
    if (state === "output-error") return <ToolErrorCard toolName={toolName} />;

    const assessmentPreface = extractToolInput<StartAssessmentInput>(part, "startAssessment");
    if (assessmentPreface) return <AssessmentPrefaceCard data={assessmentPreface} />;

    const question = extractToolInput<AskQuestionInput>(part, "askQuestion");
    if (question) return <QuestionCard data={question} toolCallId={toolCallId} isAnswered={answeredIds.has(toolCallId)} answeredValue={answeredIds.get(toolCallId)} isLoading={isLoading} onAnswer={onAnswer} />;

    if (state === "approval-requested") return renderApproval(part, toolName, onApproval);
    return null;
}

export function ToolPartRenderer({ part, onAnswer, onApproval, answeredIds, isLoading, sessionId, onSendReferralMessage }: Readonly<ToolPartRendererProps>) {
    const [referralLoading, setReferralLoading] = useState(false);
    const state = getToolPartState(part);
    const toolName = getToolPartName(part);
    const toolCallId = (part as unknown as { toolCallId?: string }).toolCallId ?? "";

    if (state === "input-streaming") return <ToolStreamingCard toolName={toolName} />;

    if (!isToolPart(part)) return null;

    const displayOnlyCard = withOutcomeLink(part, renderDisplayOnlyTool(part));
    if (displayOnlyCard) return displayOnlyCard;

    const referralCard = renderReferralPart(part, sessionId, onSendReferralMessage, referralLoading, setReferralLoading);
    if (referralCard) return referralCard;

    return renderInteractiveTool({ part, state, toolName, toolCallId, answeredIds, isLoading, onAnswer, onApproval });
}
