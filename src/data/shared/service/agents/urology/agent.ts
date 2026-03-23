import type { InferAgentUIMessage } from "ai";
import { createAgent } from "../base/agent";
import { buildUrologyPrompt } from "./prompt";
import { askQuestionTool } from "../global-tools/ask-question.tool";
import { startAssessmentTool } from "../global-tools/start-assessment.tool";

export const urologyAgent = createAgent({
  id: "urology",
  buildSystemPrompt: () => buildUrologyPrompt(),
  buildTools: () => ({
    startAssessment: startAssessmentTool,
    askQuestion: askQuestionTool,
  }),
});

export type UrologyAgentUIMessage = InferAgentUIMessage<typeof urologyAgent>;
