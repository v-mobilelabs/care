/**
 * Agent System — Multi-Agent Architecture for CareAI
 *
 * - Gateway Agent: Fast routing to the right specialist
 * - Clinical Agent: General medical chat with Pro model + thinking
 * - Diet Planner Chat Agent: 7-day meal plan generation in chat
 * - Prescription Chat Agent: Prescription generation in chat
 * - Blood Test Chat Agent: Blood test interpretation and analysis in chat
 *
 * All clinical agents use createAgent() (factory pattern with composable middleware).
 * The gateway decides which agent handles each user message.
 */

// ── Base agent factory + types ────────────────────────────────────────────────
export {
  createAgent,
  type AgentCallOptions,
  type AgentConfig,
} from "./base/agent";

// ── Specialist agents (singleton instances + UI message types) ────────────────
export { clinicalAgent, type ClinicalAgentUIMessage } from "./clinical/agent";
export {
  dietPlannerChatAgent,
  type DietPlannerAgentUIMessage,
} from "./diet-planner/agent";
export {
  prescriptionChatAgent,
  type PrescriptionAgentUIMessage,
} from "./prescription/agent";
export {
  bloodTestChatAgent,
  type BloodTestAgentUIMessage,
} from "./blood-test/agent";
export { patientAgent, type PatientAgentUIMessage } from "./patient/agent";

// ── Union of all agent UI message types ───────────────────────────────────────
// Pass this to useChat<ChatUIMessage>() for typed tool parts on the client.
import type { ClinicalAgentUIMessage as _Clinical } from "./clinical/agent";
import type { DietPlannerAgentUIMessage as _Diet } from "./diet-planner/agent";
import type { PrescriptionAgentUIMessage as _Rx } from "./prescription/agent";
import type { BloodTestAgentUIMessage as _Bt } from "./blood-test/agent";
import type { PatientAgentUIMessage as _Pt } from "./patient/agent";
export type ChatUIMessage = _Clinical | _Diet | _Rx | _Bt | _Pt;

// ── Infrastructure ────────────────────────────────────────────────────────────
export { gatewayAgent, GatewayAgent, AgentType } from "./gateway/agent";
export type { GatewayInput, ClinicalRouting } from "./gateway/agent";
