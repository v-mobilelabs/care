import type { InferAgentUIMessage } from "ai";
import { createAgent } from "../base/agent";
import { buildRadiologyPrompt } from "./prompt";
import { buildAttachmentContext } from "../clinical/prompt";

export const radiologyAgent = createAgent({
  id: "radiology",
  buildSystemPrompt: () => buildRadiologyPrompt(),
  allowActionCard: false,
  buildDynamicContext: (options) =>
    buildAttachmentContext(options.hasAttachment ?? false),
  buildTools: () => ({}),
});

export type RadiologyAgentUIMessage = InferAgentUIMessage<
  typeof radiologyAgent
>;
