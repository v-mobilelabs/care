import type { InferAgentUIMessage } from "ai";
import { createAgent } from "../base/agent";
import { buildCardiologyPrompt } from "./prompt";
import { buildAttachmentContext } from "../clinical/prompt";
import { askQuestionTool } from "../global-tools/ask-question.tool";
import { startAssessmentTool } from "../global-tools/start-assessment.tool";

export const cardiologyAgent = createAgent({
  id: "cardiology",
  buildSystemPrompt: () => buildCardiologyPrompt(),
  buildDynamicContext: (options) =>
    buildAttachmentContext(options.hasAttachment ?? false),
  buildTools: () => ({
    startAssessment: startAssessmentTool,
    askQuestion: askQuestionTool,
  }),
});

export type CardiologyAgentUIMessage = InferAgentUIMessage<
  typeof cardiologyAgent
>;
