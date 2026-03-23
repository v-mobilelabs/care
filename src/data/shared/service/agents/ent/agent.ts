import type { InferAgentUIMessage } from "ai";
import { createAgent } from "../base/agent";
import { buildEntPrompt } from "./prompt";
import { askQuestionTool } from "../global-tools/ask-question.tool";
import { startAssessmentTool } from "../global-tools/start-assessment.tool";

export const entAgent = createAgent({
  id: "ent",
  buildSystemPrompt: () => buildEntPrompt(),
  buildTools: () => ({
    startAssessment: startAssessmentTool,
    askQuestion: askQuestionTool,
  }),
});

export type EntAgentUIMessage = InferAgentUIMessage<typeof entAgent>;
