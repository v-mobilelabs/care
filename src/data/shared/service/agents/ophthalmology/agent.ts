import type { InferAgentUIMessage } from "ai";
import { createAgent } from "../base/agent";
import { buildOphthalmologyPrompt } from "./prompt";
import { askQuestionTool } from "../global-tools/ask-question.tool";
import { startAssessmentTool } from "../global-tools/start-assessment.tool";

export const ophthalmologyAgent = createAgent({
  id: "ophthalmology",
  buildSystemPrompt: () => buildOphthalmologyPrompt(),
  assessmentConfig: {
    adaptiveMode: true,
  },
  buildTools: () => ({
    startAssessment: startAssessmentTool,
    askQuestion: askQuestionTool,
  }),
});

export type OphthalmologyAgentUIMessage = InferAgentUIMessage<
  typeof ophthalmologyAgent
>;
