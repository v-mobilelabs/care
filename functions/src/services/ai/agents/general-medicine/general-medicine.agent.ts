/**
 * General Medicine Subagent
 * Specialized agent for medical symptoms, diagnoses, treatments, and health education
 */

import { ToolLoopAgent, stepCountIs } from "ai";
import { getModel } from "@/lib/model.js";
import { GENERAL_MEDICINE_INSTRUCTIONS } from "./prompt.js";

/**
 * Create the General Medicine Subagent
 * This agent specializes in medical queries and can perform deep analysis
 * with multiple tool calls before returning a summary to the main router
 */
export function createGeneralMedicineSubagent() {
  const proModel = getModel("pro");

  const generalMedicineAgent = new ToolLoopAgent({
    model: proModel,
    instructions: GENERAL_MEDICINE_INSTRUCTIONS,
    tools: {
      // Future: Add specialized tools like:
      // - medical_knowledge_lookup: Search medical databases
      // - drug_interaction_check: Check medication interactions
      // - symptom_matcher: Match symptoms to conditions
      // - guideline_search: Look up clinical guidelines
    },
    stopWhen: stepCountIs(8),
  });

  return generalMedicineAgent;
}

/**
 * Lazy singleton — initialized on first use, after Firebase Admin is ready.
 */
type GeneralMedicineSubagent = ReturnType<typeof createGeneralMedicineSubagent>;
let _instance: GeneralMedicineSubagent | null = null;
export function getGeneralMedicineSubagent(): GeneralMedicineSubagent {
  if (!_instance) {
    _instance = createGeneralMedicineSubagent();
  }
  return _instance;
}
