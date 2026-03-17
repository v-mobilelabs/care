import type { InferAgentUIMessage } from "ai";
import { createAgent } from "@/data/shared/service/agents/base/agent";
import { buildPatientPrompt } from "./prompt";
import { createGetProfileTool } from "./tools/get-profile.tool";
import { createGetPatientTool } from "./tools/get-patient.tool";
import { createGetMedicationsTool } from "./tools/get-medications.tool";
import { askQuestionTool } from "@/data/shared/service/agents/clinical/tools/ask-question.tool";

/** Singleton — import this throughout the server-side application. */
export const patientAgent = createAgent({
  id: "patient",
  buildSystemPrompt: () => buildPatientPrompt(),
  buildTools: (options) => ({
    getProfile: createGetProfileTool(options.userId),
    getPatient: createGetPatientTool(options.userId),
    getMedications: createGetMedicationsTool(
      options.userId,
      options.dependentId,
    ),
    askQuestion: askQuestionTool,
  }),
  // Patient data queries are simple retrieval — never need deep reasoning
  useThinking: false,
  maxSteps: 5,
});

/** Typed UIMessage for the patient agent — use on client for typed tool parts. */
export type PatientAgentUIMessage = InferAgentUIMessage<typeof patientAgent>;
