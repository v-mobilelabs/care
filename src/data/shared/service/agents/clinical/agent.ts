/**
 * Clinical Agent — General medical reasoning and assessment
 *
 * The primary agent for patient chat. Handles symptom analysis, condition
 * identification, health assessments, medication questions, and more.
 *
 * Built via `createAgent` which provides:
 * - Credit gating (one credit per stream call)
 * - RAG retrieval of patient medical records (reranked, top 5)
 * - Clinical guideline injection (AHA, ADA, NICE, WHO)
 * - ToolLoopAgent delegation with Gemini Pro + thinking mode
 * - Google context caching for static prompt + tools
 *
 * This agent focuses on:
 * - Providing the clinical system prompt
 * - Supplying the attachment-context note per request
 * - askQuestion + startAssessment tools
 */

import type { InferAgentUIMessage } from "ai";
import { createAgent } from "../base/agent";
import { buildClinicalPrompt, buildAttachmentContext } from "./prompt";
import { askQuestionTool } from "./tools/ask-question.tool";
import { startAssessmentTool } from "./tools/start-assessment.tool";

/** Singleton — import this throughout the server-side application. */
export const clinicalAgent = createAgent({
  id: "clinical",
  buildSystemPrompt: () => buildClinicalPrompt(),
  buildDynamicContext: (options) =>
    buildAttachmentContext(options.hasAttachment ?? false),
  buildTools: () => ({
    startAssessment: startAssessmentTool,
    askQuestion: askQuestionTool,
  }),
});

/** Typed UIMessage for the clinical agent — use on client for typed tool parts. */
export type ClinicalAgentUIMessage = InferAgentUIMessage<typeof clinicalAgent>;
