/**
 * Triage Nurse Agent — Conversational intake & routing
 *
 * Activated by the gateway for ambiguous queries. Asks 1–3 clarifying
 * questions using askQuestion, then the system routes to the specialist.
 * The nurse itself never provides clinical advice.
 */

import type { InferAgentUIMessage } from "ai";
import { createAgent } from "../base/agent";
import { buildTriageNursePrompt } from "./prompt";
import { askQuestionTool } from "@/data/shared/service/agents/global-tools/ask-question.tool";
import { logVitalTool } from "@/data/shared/service/agents/global-tools/log-vital.tool";
import { createRouteSpecialistTool } from "./tools/route-specialist.tool";

/** Singleton — import this throughout the server-side application. */
export const triageNurseAgent = createAgent({
  id: "triageNurse",
  buildSystemPrompt: () => buildTriageNursePrompt(),
  buildTools: (options) => ({
    askQuestion: askQuestionTool,
    logVital: logVitalTool,
    routeSpecialist: createRouteSpecialistTool(options),
  }),
  // Triage is fast — no deep thinking needed
  useThinking: false,
  maxSteps: 5,
  temperature: 0.3,
});

/** Typed UIMessage for the triage nurse agent. */
export type TriageNurseAgentUIMessage = InferAgentUIMessage<
  typeof triageNurseAgent
>;
