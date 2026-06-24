import type { InferAgentUIMessage } from "ai";
import { createAgent } from "../base/agent";
import { buildDermatologyPrompt } from "./prompt";
import { askQuestionTool } from "../global-tools/ask-question.tool";
import { startAssessmentTool } from "../global-tools/start-assessment.tool";

export const dermatologyAgent = createAgent({
  id: "dermatology",
  buildSystemPrompt: () => buildDermatologyPrompt(),
  assessmentConfig: {
    adaptiveMode: true,
  },
  buildTools: () => ({
    startAssessment: startAssessmentTool,
    askQuestion: askQuestionTool,
  }),
});

export type DermatologyAgentUIMessage = InferAgentUIMessage<
  typeof dermatologyAgent
>;
