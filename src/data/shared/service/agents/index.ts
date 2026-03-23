/**
 * Agent System — Multi-Agent Architecture for CareAI
 *
 * - Gateway Agent: Fast routing to the right specialist
 * - Clinical Agent: General medical chat with Pro model + thinking
 * - Diet Planner Chat Agent: 7-day meal plan generation in chat
 * - Prescription Chat Agent: Prescription generation in chat
 * - Lab Report Chat Agent: Lab report interpretation and analysis in chat
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
export {
  dietPlannerChatAgent,
  type DietPlannerAgentUIMessage,
} from "./diet-planner/agent";
export {
  prescriptionChatAgent,
  type PrescriptionAgentUIMessage,
} from "./prescription/agent";
export {
  labReportChatAgent,
  type LabReportAgentUIMessage,
} from "./lab-report/agent";
export { patientAgent, type PatientAgentUIMessage } from "./patient/agent";
export {
  triageNurseAgent,
  type TriageNurseAgentUIMessage,
} from "./triage-nurse/agent";
export {
  generalMedicineAgent,
  type GeneralMedicineAgentUIMessage,
} from "./general-medicine/agent";
export {
  neurologyAgent,
  type NeurologyAgentUIMessage,
} from "./neurology/agent";
export {
  cardiologyAgent,
  type CardiologyAgentUIMessage,
} from "./cardiology/agent";
export {
  mentalHealthAgent,
  type MentalHealthAgentUIMessage,
} from "./mental-health/agent";
export {
  dermatologyAgent,
  type DermatologyAgentUIMessage,
} from "./dermatology/agent";
export {
  pediatricsAgent,
  type PediatricsAgentUIMessage,
} from "./pediatrics/agent";
export {
  womensHealthAgent,
  type WomensHealthAgentUIMessage,
} from "./womens-health/agent";
export {
  orthopedicsAgent,
  type OrthopedicsAgentUIMessage,
} from "./orthopedics/agent";
export {
  gastroenterologyAgent,
  type GastroenterologyAgentUIMessage,
} from "./gastroenterology/agent";
export {
  endocrinologyAgent,
  type EndocrinologyAgentUIMessage,
} from "./endocrinology/agent";
export { urologyAgent, type UrologyAgentUIMessage } from "./urology/agent";
export {
  radiologyAgent,
  type RadiologyAgentUIMessage,
} from "./radiology/agent";
export {
  dentistryAgent,
  type DentistryAgentUIMessage,
} from "./dentistry/agent";
export {
  nutritionAgent,
  type NutritionAgentUIMessage,
} from "./nutrition/agent";
export {
  immunologyAgent,
  type ImmunologyAgentUIMessage,
} from "./immunology/agent";
export { entAgent, type EntAgentUIMessage } from "./ent/agent";
export {
  ophthalmologyAgent,
  type OphthalmologyAgentUIMessage,
} from "./ophthalmology/agent";
export {
  nephrologyAgent,
  type NephrologyAgentUIMessage,
} from "./nephrology/agent";

// ── Union of all agent UI message types ───────────────────────────────
// Pass this to useChat<ChatUIMessage>() for typed tool parts on the client.
import type { DietPlannerAgentUIMessage as _Diet } from "./diet-planner/agent";
import type { PrescriptionAgentUIMessage as _Rx } from "./prescription/agent";
import type { LabReportAgentUIMessage as _Lr } from "./lab-report/agent";
import type { PatientAgentUIMessage as _Pt } from "./patient/agent";
import type { TriageNurseAgentUIMessage as _Triage } from "./triage-nurse/agent";
import type { GeneralMedicineAgentUIMessage as _General } from "./general-medicine/agent";
import type { NeurologyAgentUIMessage as _Neuro } from "./neurology/agent";
import type { CardiologyAgentUIMessage as _Cardio } from "./cardiology/agent";
import type { MentalHealthAgentUIMessage as _Mental } from "./mental-health/agent";
import type { DermatologyAgentUIMessage as _Derm } from "./dermatology/agent";
import type { PediatricsAgentUIMessage as _Peds } from "./pediatrics/agent";
import type { WomensHealthAgentUIMessage as _Women } from "./womens-health/agent";
import type { OrthopedicsAgentUIMessage as _Ortho } from "./orthopedics/agent";
import type { GastroenterologyAgentUIMessage as _Gastro } from "./gastroenterology/agent";
import type { EndocrinologyAgentUIMessage as _Endo } from "./endocrinology/agent";
import type { UrologyAgentUIMessage as _Uro } from "./urology/agent";
import type { RadiologyAgentUIMessage as _Radio } from "./radiology/agent";
import type { DentistryAgentUIMessage as _Dent } from "./dentistry/agent";
import type { NutritionAgentUIMessage as _Nutri } from "./nutrition/agent";
import type { ImmunologyAgentUIMessage as _Immuno } from "./immunology/agent";
import type { EntAgentUIMessage as _Ent } from "./ent/agent";
import type { OphthalmologyAgentUIMessage as _Eye } from "./ophthalmology/agent";
import type { NephrologyAgentUIMessage as _Nephro } from "./nephrology/agent";
export type ChatUIMessage =
  | _Diet
  | _Rx
  | _Lr
  | _Pt
  | _Triage
  | _General
  | _Neuro
  | _Cardio
  | _Mental
  | _Derm
  | _Peds
  | _Women
  | _Ortho
  | _Gastro
  | _Endo
  | _Uro
  | _Radio
  | _Dent
  | _Nutri
  | _Immuno
  | _Ent
  | _Eye
  | _Nephro;

// ── Infrastructure ────────────────────────────────────────────────────────────
export { gatewayAgent, GatewayAgent, AgentType } from "./gateway/agent";
export type { GatewayInput, ClinicalRouting } from "./gateway/agent";
