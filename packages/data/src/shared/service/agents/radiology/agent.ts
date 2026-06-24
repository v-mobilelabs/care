import type { InferAgentUIMessage } from "ai";
import { createAgent } from "../base/agent";
import { buildRadiologyPrompt } from "./prompt";
import { exposureSliderTool } from "./tools/exposure-slider.tool";

export const radiologyAgent = createAgent({
  id: "radiology",
  buildSystemPrompt: () => buildRadiologyPrompt(),
  allowActionCard: false,
  buildTools: () => ({
    exposureSlider: exposureSliderTool,
  }),
});

export type RadiologyAgentUIMessage = InferAgentUIMessage<
  typeof radiologyAgent
>;
