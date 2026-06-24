import type { InferAgentUIMessage } from "ai";
import { createAgent } from "../base/agent";
import { buildNeurologyPrompt } from "./prompt";
import { askQuestionTool } from "../global-tools/ask-question.tool";
import { startAssessmentTool } from "../global-tools/start-assessment.tool";

export const neurologyAgent = createAgent({
  id: "neurology",
  buildSystemPrompt: () => buildNeurologyPrompt(),
  buildTools: () => ({
    startAssessment: startAssessmentTool,
    askQuestion: askQuestionTool,
  }),
});

export type NeurologyAgentUIMessage = InferAgentUIMessage<
  typeof neurologyAgent
>;
