import type { InferAgentUIMessage } from "ai";
import { createAgent } from "../base/agent";
import { buildRadiologyPrompt } from "./prompt";

export const radiologyAgent = createAgent({
  id: "radiology",
  buildSystemPrompt: () => buildRadiologyPrompt(),
  allowActionCard: false,
  buildTools: () => ({}),
});

export type RadiologyAgentUIMessage = InferAgentUIMessage<
  typeof radiologyAgent
>;
