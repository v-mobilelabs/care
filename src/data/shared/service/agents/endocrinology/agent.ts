import type { InferAgentUIMessage } from "ai";
import { createAgent } from "../base/agent";
import { buildEndocrinologyPrompt } from "./prompt";
import { askQuestionTool } from "../global-tools/ask-question.tool";
import { startAssessmentTool } from "../global-tools/start-assessment.tool";

export const endocrinologyAgent = createAgent({
  id: "endocrinology",
  buildSystemPrompt: () => buildEndocrinologyPrompt(),
  buildTools: () => ({
    startAssessment: startAssessmentTool,
    askQuestion: askQuestionTool,
  }),
});

export type EndocrinologyAgentUIMessage = InferAgentUIMessage<
  typeof endocrinologyAgent
>;
