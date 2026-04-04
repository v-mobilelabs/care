import type { InferAgentUIMessage } from "ai";
import { createAgent } from "../base/agent";
import { buildPediatricsPrompt } from "./prompt";
import { askQuestionTool } from "../global-tools/ask-question.tool";
import { startAssessmentTool } from "../global-tools/start-assessment.tool";

export const pediatricsAgent = createAgent({
  id: "pediatrics",
  buildSystemPrompt: () => buildPediatricsPrompt(),
  assessmentConfig: {
    adaptiveMode: true,
  },
  buildTools: () => ({
    startAssessment: startAssessmentTool,
    askQuestion: askQuestionTool,
  }),
});

export type PediatricsAgentUIMessage = InferAgentUIMessage<
  typeof pediatricsAgent
>;
