import type { InferAgentUIMessage } from "ai";
import { createAgent } from "../base/agent";
import { buildWomensHealthPrompt } from "./prompt";
import { askQuestionTool } from "../global-tools/ask-question.tool";
import { startAssessmentTool } from "../global-tools/start-assessment.tool";

export const womensHealthAgent = createAgent({
  id: "womensHealth",
  buildSystemPrompt: () => buildWomensHealthPrompt(),
  assessmentConfig: {
    adaptiveMode: true,
  },
  buildTools: () => ({
    startAssessment: startAssessmentTool,
    askQuestion: askQuestionTool,
  }),
});

export type WomensHealthAgentUIMessage = InferAgentUIMessage<
  typeof womensHealthAgent
>;
