import type { InferAgentUIMessage } from "ai";
import { createAgent } from "../base/agent";
import { buildGastroenterologyPrompt } from "./prompt";
import { askQuestionTool } from "../global-tools/ask-question.tool";
import { startAssessmentTool } from "../global-tools/start-assessment.tool";

export const gastroenterologyAgent = createAgent({
  id: "gastroenterology",
  buildSystemPrompt: () => buildGastroenterologyPrompt(),
  assessmentConfig: {
    adaptiveMode: true,
  },
  buildTools: () => ({
    startAssessment: startAssessmentTool,
    askQuestion: askQuestionTool,
  }),
});

export type GastroenterologyAgentUIMessage = InferAgentUIMessage<
  typeof gastroenterologyAgent
>;
