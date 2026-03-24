import type { InferAgentUIMessage } from "ai";
import { createAgent } from "@/data/shared/service/agents/base/agent";
import { buildPrescriptionPrompt } from "./prompt";
import { createSubmitPrescriptionTool } from "./tools/submit-prescription.tool";
import { createFetchPrescriptionsTool } from "./tools/fetch-prescriptions.tool";
import { askQuestionTool } from "@/data/shared/service/agents/global-tools/ask-question.tool";
import { logVitalTool } from "@/data/shared/service/agents/global-tools/log-vital.tool";
import { startAssessmentTool } from "@/data/shared/service/agents/global-tools/start-assessment.tool";

/** Singleton — import this throughout the server-side application. */
export const prescriptionChatAgent = createAgent({
  id: "prescription",
  buildSystemPrompt: () => buildPrescriptionPrompt(),
  temperature: 0.2,
  buildTools: (options) => ({
    submitPrescription: createSubmitPrescriptionTool(
      options.userId,
      options.profileId,
    ),
    fetchPrescriptions: createFetchPrescriptionsTool(
      options.userId,
      options.profileId,
    ),
    askQuestion: askQuestionTool,
    logVital: logVitalTool,
    startAssessment: startAssessmentTool,
  }),
});

/** Typed UIMessage for the prescription agent — use on client for typed tool parts. */
export type PrescriptionAgentUIMessage = InferAgentUIMessage<
  typeof prescriptionChatAgent
>;
