import type { InferAgentUIMessage } from "ai";
import { createAgent } from "@/data/shared/service/agents/base/agent";
import { buildPatientPrompt } from "./prompt";
import { createGetPatientTool } from "./tools/get-patient.tool";
import { createGetMedicationsTool } from "./tools/get-medications.tool";
import { askQuestionTool } from "@/data/shared/service/agents/global-tools/ask-question.tool";
import { logVitalTool } from "@/data/shared/service/agents/global-tools/log-vital.tool";
import { startAssessmentTool } from "@/data/shared/service/agents/global-tools/start-assessment.tool";

/** Singleton — import this throughout the server-side application. */
export const patientAgent = createAgent({
  id: "patient",
  buildSystemPrompt: () => buildPatientPrompt(),
  buildTools: (options) => ({
    getPatient: createGetPatientTool(options.userId),
    getMedications: createGetMedicationsTool(
      options.userId,
      options.dependentId,
    ),
    askQuestion: askQuestionTool,
    logVital: logVitalTool,
    startAssessment: startAssessmentTool,
  }),
  // Patient data queries are simple retrieval — never need deep reasoning
  useThinking: false,
  maxSteps: 5,
  temperature: 0.2,
});

/** Typed UIMessage for the patient agent — use on client for typed tool parts. */
export type PatientAgentUIMessage = InferAgentUIMessage<typeof patientAgent>;
