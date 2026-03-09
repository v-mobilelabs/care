"use client";
import { Group, Loader, Paper, Text, ThemeIcon } from "@mantine/core";
import { IconStethoscope } from "@tabler/icons-react";
import { isToolUIPart } from "ai";
import type { UIDataTypes, UIMessagePart, UITools } from "ai";
import type {
    AppointmentInput,
    AskQuestionInput,
    AssessmentInput,
    ConditionInput,
    DentalChartInput,
    DietPlanInput,
    LogVitalsInput,
    MedicineInput,
    NextStepsInput,
    PatientSummaryInput,
    PrescriptionInput,
    ProcedureInput,
    ProviderInput,
    SoapNoteInput,
    SuggestActionsInput,
} from "@/app/(portal)/chat/_types";
import { extractToolInput, getToolPartName, getToolPartState } from "@/app/(portal)/chat/_types";
import { AppointmentCard } from "./appointment-card";
import { AssessmentCompleteCard } from "./assessment-card";
import { ConditionCard } from "./condition-card";
import { DentalChartCard } from "./dental-chart-card";
import { DietPlanCard } from "./diet-plan-card";
import { LogVitalsCard } from "./log-vitals-card";
import { MedicineCard } from "./medicine-card";
import { NextStepsCard } from "./next-steps-card";
import { PatientSummaryCard } from "./patient-summary-card";
import { PrescriptionCard } from "./prescription-card";
import { ProcedureCard } from "./procedure-card";
import { ProviderCard } from "./provider-card";
import { QuestionCard } from "./question-card";
import { SoapNoteCard } from "./soap-note-card";
import { SuggestActionsCard } from "./suggest-actions-card";

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
    if (toolName === "orderProcedure") return "Ordering procedure…";
    if (toolName === "bookAppointment") return "Scheduling appointment…";
    if (toolName === "recommendProvider") return "Finding provider…";
    if (toolName === "completeAssessment") return "Completing assessment…";
    if (toolName === "askQuestion") return "Preparing question…";
    if (toolName === "suggestActions") return "Preparing your options…";
    if (toolName === "nextSteps") return "Preparing your action plan…";
    if (toolName === "dosDonts") return "Building lifestyle guidance…";
    if (toolName === "dietPlan") return "Creating your diet plan…";
    if (toolName === "soapNote") return "Preparing clinical notes…";
    if (toolName === "dentalChart") return "Mapping dental findings…";
    if (toolName === "logVitals") return "Logging vitals…";
    if (toolName === "generatePatientSummary") return "Generating patient summary…";
    return "Processing…";
}

export function ToolPartRenderer({ part, onAnswer, answeredIds, isLoading, onLearnMore }: Readonly<ToolPartRendererProps>) {
    const state = getToolPartState(part);
    const toolName = getToolPartName(part);
    const toolCallId = (part as unknown as { toolCallId?: string }).toolCallId ?? "";
    const isAnswered = answeredIds.has(toolCallId);

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

    const question = extractToolInput<AskQuestionInput>(part, "askQuestion");
    if (question) return <QuestionCard data={question} toolCallId={toolCallId} isAnswered={isAnswered} isLoading={isLoading} onAnswer={onAnswer} />;

    const suggestActions = extractToolInput<SuggestActionsInput>(part, "suggestActions");
    if (suggestActions) return <SuggestActionsCard data={suggestActions} toolCallId={toolCallId} isAnswered={isAnswered} onAnswer={onAnswer} />;

    const condition = extractToolInput<ConditionInput>(part, "recordCondition");
    if (condition) return <ConditionCard data={condition} onLearnMore={onLearnMore} />;

    const prescription = extractToolInput<PrescriptionInput>(part, "createPrescription");
    if (prescription) return <PrescriptionCard data={prescription} />;

    const medicine = extractToolInput<MedicineInput>(part, "addMedicine");
    if (medicine) return <MedicineCard data={medicine} />;

    const procedure = extractToolInput<ProcedureInput>(part, "orderProcedure");
    if (procedure) return <ProcedureCard data={procedure} />;

    const appointment = extractToolInput<AppointmentInput>(part, "bookAppointment");
    if (appointment) return <AppointmentCard data={appointment} />;

    const provider = extractToolInput<ProviderInput>(part, "recommendProvider");
    if (provider) return <ProviderCard data={provider} />;

    const assessment = extractToolInput<AssessmentInput>(part, "completeAssessment");
    if (assessment) return <AssessmentCompleteCard data={assessment} />;

    const nextSteps = extractToolInput<NextStepsInput>(part, "nextSteps");
    if (nextSteps) return <NextStepsCard data={nextSteps} />;

    const dietPlan = extractToolInput<DietPlanInput>(part, "dietPlan");
    if (dietPlan) return <DietPlanCard data={dietPlan} />;

    const soapNote = extractToolInput<SoapNoteInput>(part, "soapNote");
    if (soapNote) return <SoapNoteCard data={soapNote} />;

    const dentalChart = extractToolInput<DentalChartInput>(part, "dentalChart");
    if (dentalChart) return <DentalChartCard data={dentalChart} />;

    const logVitals = extractToolInput<LogVitalsInput>(part, "logVitals");
    if (logVitals) return <LogVitalsCard data={logVitals} />;

    const patientSummary = extractToolInput<PatientSummaryInput>(part, "generatePatientSummary");
    if (patientSummary) return <PatientSummaryCard data={patientSummary} />;

    if (toolName) {
        return (
            <Paper withBorder radius="lg" p="md">
                <Group gap="xs">
                    <ThemeIcon size={28} radius="md" color="gray" variant="light">
                        <IconStethoscope size={15} />
                    </ThemeIcon>
                    <Text size="sm" c="dimmed">
                        Clinical tool: {toolName}
                    </Text>
                </Group>
            </Paper>
        );
    }

    return null;
}
