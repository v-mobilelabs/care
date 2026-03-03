import type { UIMessagePart, UIDataTypes, UITools } from "ai";

// ── Tool input types ──────────────────────────────────────────────────────────

export type Severity = "mild" | "moderate" | "severe" | "critical";
export type RiskLevel = "low" | "moderate" | "high" | "emergency";

export interface ConditionInput {
  name: string;
  icd10?: string;
  severity: Severity;
  status: "suspected" | "probable" | "confirmed";
  description: string;
  symptoms: string[];
}

export interface MedicationItem {
  name: string;
  dosage: string;
  form: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface PrescriptionInput {
  title: string;
  condition: string;
  medications: MedicationItem[];
  notes?: string;
  urgent?: boolean;
}

export interface MedicineInput {
  name: string;
  category: "OTC" | "supplement" | "herbal" | "probiotic";
  indication: string;
  dosage: string;
  frequency: string;
  duration?: string;
  warnings?: string[];
  notes?: string;
}

export interface ProcedureInput {
  name: string;
  type: string;
  priority: "routine" | "urgent" | "stat";
  indication: string;
  preparation?: string;
  notes?: string;
}

export interface AppointmentInput {
  specialty: string;
  urgency: string;
  reason: string;
  visitType: string;
  notes?: string;
}

export interface ProviderInput {
  role: string;
  specialty?: string;
  reason: string;
  urgency: "immediately" | "soon" | "routine";
  notes?: string;
}

export interface AssessmentInput {
  summary: string;
  primaryDiagnosis?: string;
  riskLevel: RiskLevel;
  immediateActions: string[];
  disclaimer: string;
}

export type QuestionType =
  | "yes_no"
  | "single_choice"
  | "multi_choice"
  | "scale"
  | "free_text";

export interface AskQuestionInput {
  question: string;
  type: QuestionType;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
}

export interface NextStepsInput {
  condition: string;
  immediate: string[];
  shortTerm: string[];
  longTerm: string[];
  redFlags: string[];
}

export interface DosDontsInput {
  condition: string;
  dos: { action: string; reason: string }[];
  donts: { action: string; reason: string }[];
}

export interface DietFood {
  item: string;
  portion: string; // e.g. "1 cup (240 g)"
  calories: number;
}

export interface DietMeal {
  name: string; // "Breakfast", "Morning Snack", "Lunch", "Afternoon Snack", "Dinner"
  time: string; // "7:00–8:00 AM"
  foods: DietFood[];
  totalCalories: number;
}

export interface DietDay {
  day: string; // "Monday"
  meals: DietMeal[];
  totalCalories: number;
}

export interface DietPlanInput {
  condition: string;
  overview: string;
  weeklyWeightLossEstimate: string; // e.g. "0.5–0.8 kg per week"
  totalDailyCalories: number;
  weeklyPlan: DietDay[];
  recommended: { food: string; reason: string }[];
  avoid: { food: string; reason: string }[];
  tips: string[];
}

export interface SoapNoteInput {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string[];
  condition: string;
  riskLevel: RiskLevel;
}

export type DentalCondition =
  | "normal"
  | "caries"
  | "missing"
  | "crown"
  | "root_canal"
  | "impacted"
  | "periapical_lesion"
  | "watch"
  | "unerupted"
  | "bridge";

export interface DentalFinding {
  tooth: number;
  condition: DentalCondition;
  note?: string;
  severity?: "mild" | "moderate" | "severe";
}

export interface DentalChartInput {
  summary: string;
  orthodonticFindings?: string;
  findings: DentalFinding[];
}

export interface SuggestActionItem {
  label: string;
  message: string;
}

export interface SuggestActionsInput {
  condition: string;
  actions: SuggestActionItem[];
}

// ── Colour maps ───────────────────────────────────────────────────────────────

export const SEVERITY_COLOR: Record<Severity, string> = {
  mild: "teal",
  moderate: "yellow",
  severe: "orange",
  critical: "red",
};

export const RISK_COLOR: Record<RiskLevel, string> = {
  low: "teal",
  moderate: "yellow",
  high: "orange",
  emergency: "red",
};

export const PRIORITY_COLOR: Record<"routine" | "urgent" | "stat", string> = {
  routine: "gray",
  urgent: "orange",
  stat: "red",
};

export const URGENCY_COLOR: Record<"immediately" | "soon" | "routine", string> =
  {
    immediately: "red",
    soon: "orange",
    routine: "teal",
  };

// ── Tool part helpers ─────────────────────────────────────────────────────────

export function getToolPartState(
  part: UIMessagePart<UIDataTypes, UITools>,
): string | null {
  const p = part as unknown as { state?: string };
  return p.state ?? null;
}

export function getToolPartName(
  part: UIMessagePart<UIDataTypes, UITools>,
): string | null {
  // Use type string directly so this works on plain JSON-deserialized objects
  // (isToolUIPart guard fails on those because they lack internal SDK metadata).
  const p = part as unknown as { type?: string; toolName?: string };
  if (typeof p.type === "string" && p.type.startsWith("tool-")) {
    return p.type.slice(5);
  }
  return p.toolName ?? null;
}

export function extractToolInput<T>(
  part: UIMessagePart<UIDataTypes, UITools>,
  toolName: string,
): T | null {
  const name = getToolPartName(part);
  if (name !== toolName) return null;
  const state = getToolPartState(part);
  if (state === "input-streaming") return null;
  const p = part as unknown as { input: T };
  if (p.input == null) return null;
  return p.input;
}

// ── Answer tracking helper ────────────────────────────────────────────────────

export function addToSet(
  prev: ReadonlySet<string>,
  id: string,
): ReadonlySet<string> {
  const next = new Set(prev);
  next.add(id);
  return next;
}
