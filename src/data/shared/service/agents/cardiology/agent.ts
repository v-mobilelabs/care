import type { InferAgentUIMessage } from "ai";
import { createAgent } from "../base/agent";
import { buildCardiologyPrompt } from "./prompt";
import { askQuestionTool } from "../global-tools/ask-question.tool";
import { startAssessmentTool } from "../global-tools/start-assessment.tool";

export const cardiologyAgent = createAgent({
  id: "cardiology",
  buildSystemPrompt: () => buildCardiologyPrompt(),
  assessmentConfig: {
    adaptiveMode: true,
  },
  buildTools: () => ({
    startAssessment: startAssessmentTool,
    askQuestion: askQuestionTool,
  }),
});

export type CardiologyAgentUIMessage = InferAgentUIMessage<
  typeof cardiologyAgent
>;
