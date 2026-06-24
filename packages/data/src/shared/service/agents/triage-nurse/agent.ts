/**
 * Triage Nurse Agent
 *
 * Handles intake triage and intent clarification.
 */

import type { InferAgentUIMessage } from "ai";
import { createAgent } from "../base/agent";
import { buildTriageNursePrompt } from "./prompt";
import { askQuestionTool } from "../global-tools/ask-question.tool";
import { startAssessmentTool } from "../global-tools/start-assessment.tool";

/** Singleton — import this throughout the server-side application. */
export const triageNurseAgent = createAgent({
  id: "triageNurse",
  buildSystemPrompt: () => buildTriageNursePrompt(),
  assessmentConfig: {
    adaptiveMode: true,
  },
  buildTools: () => ({
    startAssessment: startAssessmentTool,
    askQuestion: askQuestionTool,
  }),
});

/** Typed UIMessage for the triage nurse agent. */
export type TriageNurseAgentUIMessage = InferAgentUIMessage<
  typeof triageNurseAgent
>;
