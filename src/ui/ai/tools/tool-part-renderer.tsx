"use client";
import { Group, Loader, Paper, Text, ThemeIcon } from "@mantine/core";
import { IconCheck, IconExclamationCircle } from "@tabler/icons-react";
import { isToolUIPart } from "ai";
import type { UIDataTypes, UIMessagePart, UITools } from "ai";
import type {
    AskQuestionInput,
    AssessmentInput,
    ConditionInput,
    DietPlanInput,
    MedicineInput,
    PatientSummaryInput,
    PrescriptionInput,
    SoapNoteInput,
    StartAssessmentInput,
} from "@/app/(portal)/patient/_types";
import { extractToolInput, getToolPartName, getToolPartState } from "@/app/(portal)/patient/_types";
import { AssessmentCompleteCard } from "./assessment-card";
import { AssessmentPrefaceCard } from "./assessment-preface-card";
import { ConditionCard } from "./condition-card";
import { DietPlanCard } from "./diet-plan-card";
import { MedicineCard } from "./medicine-card";
import { PatientSummaryCard } from "./patient-summary-card";
import { PrescriptionCard } from "./prescription-card";
import { QuestionCard } from "./question-card";
import { SoapNoteCard } from "./soap-note-card";

export interface ToolPartRendererProps {
    part: UIMessagePart<UIDataTypes, UITools>;
    onAnswer: (toolCallId: string, answer: string) => void;
    answeredIds: ReadonlySet<string>;
    isLoading: boolean;
    onLearnMore?: (text: string) => void;
}

function getStreamingLabel(toolName: string | null): string {
    if (toolName === "recordCondition") return "Identifying condition…";
    if (toolName === "createPrescription") return "Creating prescription…";
    if (toolName === "addMedicine") return "Documenting medicine…";
    if (toolName === "completeAssessment") return "Completing assessment…";
    if (toolName === "startAssessment") return "Preparing assessment…";
    if (toolName === "askQuestion") return "Preparing question…";
    if (toolName === "dosDonts") return "Building lifestyle guidance…";
    if (toolName === "dietPlan") return "Creating your diet plan…";
    if (toolName === "soapNote") return "Preparing clinical notes…";
    if (toolName === "generatePatientSummary") return "Generating patient summary…";
    return "Processing…";
}

export function ToolPartRenderer({ part, onAnswer, answeredIds, isLoading, onLearnMore }: Readonly<ToolPartRendererProps>) {
    const state = getToolPartState(part);
    const toolName = getToolPartName(part);
    const toolCallId = (part as unknown as { toolCallId?: string }).toolCallId ?? "";
    const isAnswered = answeredIds.has(toolCallId);

    if (state === "output-error") {
        return (
            <Paper withBorder radius="lg" p="md" style={{ borderColor: "var(--mantine-color-red-4)" }}>
                <Group gap="xs">
                    <ThemeIcon size={28} radius="md" color="red" variant="light"><IconExclamationCircle size={15} /></ThemeIcon>
                    <Text size="sm" c="red">Failed to process{toolName ? ` (${toolName})` : ""}. Please try again.</Text>
                </Group>
            </Paper>
        );
    }

    if (state === "input-streaming") {
        const label = getStreamingLabel(toolName);
        return (
            <Paper withBorder radius="lg" p="md">
                <Group gap="xs">
                    <Loader size={16} color="primary" />
                    <Text size="sm" c="dimmed" fw={500}>
                        {label}
                    </Text>
                </Group>
            </Paper>
        );
    }

    if (!isToolUIPart(part)) return null;

    const assessmentPreface = extractToolInput<StartAssessmentInput>(part, "startAssessment");
    if (assessmentPreface) return <AssessmentPrefaceCard data={assessmentPreface} />;

    const question = extractToolInput<AskQuestionInput>(part, "askQuestion");
    if (question) return <QuestionCard data={question} toolCallId={toolCallId} isAnswered={isAnswered} isLoading={isLoading} onAnswer={onAnswer} />;

    const condition = extractToolInput<ConditionInput>(part, "recordCondition");
    if (condition) return <ConditionCard data={condition} onLearnMore={onLearnMore} />;

    const prescription = extractToolInput<PrescriptionInput>(part, "createPrescription");
    if (prescription) return <PrescriptionCard data={prescription} />;

    const medicine = extractToolInput<MedicineInput>(part, "addMedicine");
    if (medicine) return <MedicineCard data={medicine} />;

    const assessment = extractToolInput<AssessmentInput>(part, "completeAssessment");
    if (assessment) return <AssessmentCompleteCard data={assessment} />;

    const dietPlan = extractToolInput<DietPlanInput>(part, "dietPlan");
    if (dietPlan) return <DietPlanCard data={dietPlan} />;

    const soapNote = extractToolInput<SoapNoteInput>(part, "soapNote");
    if (soapNote) return <SoapNoteCard data={soapNote} />;

    const patientSummary = extractToolInput<PatientSummaryInput>(part, "generatePatientSummary");
    if (patientSummary) return <PatientSummaryCard data={patientSummary} />;

    if (toolName) {
        const isExecuting = state === "input-available";
        const label = isExecuting
            ? getStreamingLabel(toolName)
            : `${toolName} completed`;
        return (
            <Paper withBorder radius="lg" p="md">
                <Group gap="xs">
                    {isExecuting
                        ? <Loader size={16} color="primary" />
                        : <ThemeIcon size={28} radius="md" color="teal" variant="light"><IconCheck size={15} /></ThemeIcon>
                    }
                    <Text size="sm" c="dimmed">
                        {label}
                    </Text>
                </Group>
            </Paper>
        );
    }

    return null;
}
