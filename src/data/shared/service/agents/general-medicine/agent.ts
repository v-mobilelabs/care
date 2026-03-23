/**
 * General Medicine Agent — Primary care / internal medicine
 *
 * The default fallback agent. Handles undifferentiated symptoms,
 * chronic disease management, infections, and general health queries.
 */

import type { InferAgentUIMessage } from "ai";
import { createAgent } from "../base/agent";
import { buildGeneralMedicinePrompt } from "./prompt";
import { buildAttachmentContext } from "../clinical/prompt";
import { askQuestionTool } from "../global-tools/ask-question.tool";
import { startAssessmentTool } from "../global-tools/start-assessment.tool";

/** Singleton — import this throughout the server-side application. */
export const generalMedicineAgent = createAgent({
  id: "generalMedicine",
  buildSystemPrompt: () => buildGeneralMedicinePrompt(),
  buildDynamicContext: (options) =>
    buildAttachmentContext(options.hasAttachment ?? false),
  buildTools: () => ({
    startAssessment: startAssessmentTool,
    askQuestion: askQuestionTool,
  }),
});

/** Typed UIMessage for the general medicine agent. */
export type GeneralMedicineAgentUIMessage = InferAgentUIMessage<
  typeof generalMedicineAgent
>;
