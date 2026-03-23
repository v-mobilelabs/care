import type { InferAgentUIMessage } from "ai";
import { createAgent } from "../base/agent";
import { buildNephrologyPrompt } from "./prompt";
import { askQuestionTool } from "../global-tools/ask-question.tool";
import { startAssessmentTool } from "../global-tools/start-assessment.tool";

export const nephrologyAgent = createAgent({
  id: "nephrology",
  buildSystemPrompt: () => buildNephrologyPrompt(),
  buildTools: () => ({
    startAssessment: startAssessmentTool,
    askQuestion: askQuestionTool,
  }),
});

export type NephrologyAgentUIMessage = InferAgentUIMessage<
  typeof nephrologyAgent
>;
