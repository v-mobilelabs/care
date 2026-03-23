import type { InferAgentUIMessage } from "ai";
import { createAgent } from "../base/agent";
import { buildRadiologyPrompt } from "./prompt";
import { buildAttachmentContext } from "../clinical/prompt";
import { askQuestionTool } from "../global-tools/ask-question.tool";

export const radiologyAgent = createAgent({
  id: "radiology",
  buildSystemPrompt: () => buildRadiologyPrompt(),
  buildDynamicContext: (options) =>
    buildAttachmentContext(options.hasAttachment ?? false),
  buildTools: () => ({
    askQuestion: askQuestionTool,
  }),
});

export type RadiologyAgentUIMessage = InferAgentUIMessage<
  typeof radiologyAgent
>;
