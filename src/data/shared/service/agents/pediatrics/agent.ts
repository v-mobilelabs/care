import type { InferAgentUIMessage } from "ai";
import { createAgent } from "../base/agent";
import { buildPediatricsPrompt } from "./prompt";
import { buildAttachmentContext } from "../clinical/prompt";
import { askQuestionTool } from "../global-tools/ask-question.tool";
import { startAssessmentTool } from "../global-tools/start-assessment.tool";

export const pediatricsAgent = createAgent({
  id: "pediatrics",
  buildSystemPrompt: () => buildPediatricsPrompt(),
  buildDynamicContext: (options) =>
    buildAttachmentContext(options.hasAttachment ?? false),
  buildTools: () => ({
    startAssessment: startAssessmentTool,
    askQuestion: askQuestionTool,
  }),
});

export type PediatricsAgentUIMessage = InferAgentUIMessage<
  typeof pediatricsAgent
>;
