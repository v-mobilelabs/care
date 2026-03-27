import type { InferAgentUIMessage } from "ai";
import { createAgent } from "../base/agent";
import { buildDentistryPrompt } from "./prompt";
import { buildAttachmentContext } from "../clinical/prompt";
import { askQuestionTool } from "../global-tools/ask-question.tool";
import { startAssessmentTool } from "../global-tools/start-assessment.tool";

export const dentistryAgent = createAgent({
  id: "dentistry",
  buildSystemPrompt: () => buildDentistryPrompt(),
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

export type DentistryAgentUIMessage = InferAgentUIMessage<
  typeof dentistryAgent
>;
