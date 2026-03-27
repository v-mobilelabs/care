import type { InferAgentUIMessage } from "ai";
import { createAgent } from "../base/agent";
import { buildOrthopedicsPrompt } from "./prompt";
import { buildAttachmentContext } from "../clinical/prompt";
import { askQuestionTool } from "../global-tools/ask-question.tool";
import { startAssessmentTool } from "../global-tools/start-assessment.tool";

export const orthopedicsAgent = createAgent({
  id: "orthopedics",
  buildSystemPrompt: () => buildOrthopedicsPrompt(),
  buildDynamicContext: (options) =>
    buildAttachmentContext(options.hasAttachment ?? false),
  assessmentConfig: {
    adaptiveMode: true,
  },
  buildTools: () => ({
    startAssessment: startAssessmentTool,
    askQuestion: askQuestionTool,
  }),
});

export type OrthopedicsAgentUIMessage = InferAgentUIMessage<
  typeof orthopedicsAgent
>;
