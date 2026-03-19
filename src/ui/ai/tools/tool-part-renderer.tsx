"use client";
import { Group, Loader, Paper, Text, ThemeIcon } from "@mantine/core";
import { IconExclamationCircle } from "@tabler/icons-react";
import { isToolUIPart } from "ai";
import type { UIMessagePart, UIDataTypes, UITools } from "ai";
import { getToolPartName, getToolPartState, extractToolInput } from "@/ui/ai/types";
import type { AskQuestionInput, StartAssessmentInput } from "@/ui/ai/types";
import { AssessmentPrefaceCard } from "./assessment-preface-card";
import { ApprovalCard } from "./approval-card";
import { DietDayCard } from "./diet-day-card";
import { PrescriptionCard } from "./prescription-card";
import { QuestionCard } from "./question-card";
import type { EnhancedDietDay } from "@/data/diet-plans/models/nutrition.model";
import type { SubmitPrescriptionInput } from "@/data/shared/service/agents/prescription/tools/submit-prescription.tool";

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

export function ToolPartRenderer({ part, onAnswer, onApproval, answeredIds, isLoading }: Readonly<ToolPartRendererProps>) {
    const state = getToolPartState(part);
    const toolName = getToolPartName(part);
    const toolCallId = (part as unknown as { toolCallId?: string }).toolCallId ?? "";

    if (state === "output-error") return <ToolErrorCard toolName={toolName} />;
    if (state === "input-streaming") return <ToolStreamingCard toolName={toolName} />;

    const dietDay = extractToolInput<EnhancedDietDay>(part, "submitDailyPlan");
    if (dietDay?.meals && dietDay?.dailyTotals) return <DietDayCard data={dietDay} />;

    const prescription = extractToolInput<SubmitPrescriptionInput>(part, "submitPrescription");
    if (prescription?.medications) return <PrescriptionCard data={prescription} />;

    if (!isToolUIPart(part)) return null;

    const assessmentPreface = extractToolInput<StartAssessmentInput>(part, "startAssessment");
    if (assessmentPreface) return <AssessmentPrefaceCard data={assessmentPreface} />;

    const question = extractToolInput<AskQuestionInput>(part, "askQuestion");
    if (question) return <QuestionCard data={question} toolCallId={toolCallId} isAnswered={answeredIds.has(toolCallId)} answeredValue={answeredIds.get(toolCallId)} isLoading={isLoading} onAnswer={onAnswer} />;

    if (state === "approval-requested") return renderApproval(part, toolName, onApproval);

    return null;
}
