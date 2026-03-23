import type { InferAgentUIMessage } from "ai";
import { createAgent } from "../base/agent";
import { buildMentalHealthPrompt } from "./prompt";
import { askQuestionTool } from "../global-tools/ask-question.tool";
import { startAssessmentTool } from "../global-tools/start-assessment.tool";

export const mentalHealthAgent = createAgent({
  id: "mentalHealth",
  buildSystemPrompt: () => buildMentalHealthPrompt(),
  buildTools: () => ({
    startAssessment: startAssessmentTool,
    askQuestion: askQuestionTool,
  }),
});

export type MentalHealthAgentUIMessage = InferAgentUIMessage<
  typeof mentalHealthAgent
>;
