import type { InferAgentUIMessage } from "ai";
import { createAgent } from "../base/agent";
import { buildOphthalmologyPrompt } from "./prompt";
import { askQuestionTool } from "../global-tools/ask-question.tool";
import { startAssessmentTool } from "../global-tools/start-assessment.tool";
import { buildAttachmentContext } from "../clinical/prompt";

export const ophthalmologyAgent = createAgent({
  id: "ophthalmology",
  buildSystemPrompt: () => buildOphthalmologyPrompt(),
  buildDynamicContext: (options) =>
    buildAttachmentContext(options.hasAttachment ?? false),
  buildTools: () => ({
    startAssessment: startAssessmentTool,
    askQuestion: askQuestionTool,
  }),
});

export type OphthalmologyAgentUIMessage = InferAgentUIMessage<
  typeof ophthalmologyAgent
>;
