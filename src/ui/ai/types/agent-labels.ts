/**
 * Human-readable display labels for each agent type.
 * Used in the chat UI to show which specialist is responding.
 */
export const AGENT_LABELS: Record<string, string> = {
  triageNurse: "Triage Nurse",
  generalMedicine: "General Medicine",
  neurology: "Neurology",
  cardiology: "Cardiology",
  mentalHealth: "Mental Health",
  dermatology: "Dermatology",
  pediatrics: "Pediatrics",
  womensHealth: "Women's Health",
  orthopedics: "Orthopedics",
  gastroenterology: "Gastroenterology",
  endocrinology: "Endocrinology",
  urology: "Urology",
  radiology: "Radiology",
  dentistry: "Dentistry",
  nutrition: "Nutrition",
  immunology: "Immunology",
  ent: "ENT",
  ophthalmology: "Ophthalmology",
  nephrology: "Nephrology",
  dietPlanner: "Diet Planner",
  prescription: "Prescription",
  labReport: "Lab Report",
  patient: "Patient",
};

/** Get a human-readable label for an agent type, with fallback. */
export function getAgentLabel(
  agentType: string | undefined,
): string | undefined {
  if (!agentType) return undefined;
  return AGENT_LABELS[agentType];
}
