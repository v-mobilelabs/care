import type { InferAgentUIMessage } from "ai";
import { createAgent } from "../base/agent";
import { buildImmunologyPrompt } from "./prompt";
import { askQuestionTool } from "../global-tools/ask-question.tool";
import { startAssessmentTool } from "../global-tools/start-assessment.tool";

export const immunologyAgent = createAgent({
  id: "immunology",
  buildSystemPrompt: () => buildImmunologyPrompt(),
  buildTools: () => ({
    startAssessment: startAssessmentTool,
    askQuestion: askQuestionTool,
  }),
});

export type ImmunologyAgentUIMessage = InferAgentUIMessage<
  typeof immunologyAgent
>;
