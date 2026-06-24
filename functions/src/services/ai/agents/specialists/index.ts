/**
 * Specialist Prompts Registry
 *
 * Maps every Specialty enum value to its system prompt string.
 * To add a new specialty:
 *   1. Add enum entry to registry/specialty.enum.ts
 *   2. Create specialists/{name}/prompt.ts
 *   3. Add ONE import + ONE map entry here
 */

import { Specialty } from "../registry/specialty.enum.js";

// ─── Primary Care ────────────────────────────────────────────────────────────
import { GENERAL_MEDICINE_PROMPT } from "./general-medicine/prompt.js";
import { INTERNAL_MEDICINE_PROMPT } from "./internal-medicine/prompt.js";
import { PEDIATRICS_PROMPT } from "./pediatrics/prompt.js";
import { GERIATRICS_PROMPT } from "./geriatrics/prompt.js";

// ─── Surgical Specialties ─────────────────────────────────────────────────────
import { GENERAL_SURGERY_PROMPT } from "./general-surgery/prompt.js";
import { ORTHOPEDIC_SURGERY_PROMPT } from "./orthopedic-surgery/prompt.js";
import { NEUROSURGERY_PROMPT } from "./neurosurgery/prompt.js";
import { CARDIOTHORACIC_SURGERY_PROMPT } from "./cardiothoracic-surgery/prompt.js";
import { PLASTIC_SURGERY_PROMPT } from "./plastic-surgery/prompt.js";
import { VASCULAR_SURGERY_PROMPT } from "./vascular-surgery/prompt.js";
import { OPHTHALMOLOGIC_SURGERY_PROMPT } from "./ophthalmologic-surgery/prompt.js";
import { ENT_PROMPT } from "./ent/prompt.js";
import { UROLOGY_PROMPT } from "./urology/prompt.js";
import { COLORECTAL_SURGERY_PROMPT } from "./colorectal-surgery/prompt.js";

// ─── Medical Specialties ──────────────────────────────────────────────────────
import { CARDIOLOGY_PROMPT } from "./cardiology/prompt.js";
import { NEUROLOGY_PROMPT } from "./neurology/prompt.js";
import { GASTROENTEROLOGY_PROMPT } from "./gastroenterology/prompt.js";
import { PULMONOLOGY_PROMPT } from "./pulmonology/prompt.js";
import { NEPHROLOGY_PROMPT } from "./nephrology/prompt.js";
import { ENDOCRINOLOGY_PROMPT } from "./endocrinology/prompt.js";
import { RHEUMATOLOGY_PROMPT } from "./rheumatology/prompt.js";
import { HEMATOLOGY_PROMPT } from "./hematology/prompt.js";
import { ONCOLOGY_PROMPT } from "./oncology/prompt.js";
import { INFECTIOUS_DISEASES_PROMPT } from "./infectious-diseases/prompt.js";
import { DERMATOLOGY_PROMPT } from "./dermatology/prompt.js";
import { ALLERGY_IMMUNOLOGY_PROMPT } from "./allergy-immunology/prompt.js";

// ─── Women's Health ───────────────────────────────────────────────────────────
import { OB_GYN_PROMPT } from "./ob-gyn/prompt.js";
import { REPRODUCTIVE_MEDICINE_PROMPT } from "./reproductive-medicine/prompt.js";
import { MATERNAL_FETAL_MEDICINE_PROMPT } from "./maternal-fetal-medicine/prompt.js";

// ─── Mental Health ────────────────────────────────────────────────────────────
import { PSYCHIATRY_PROMPT } from "./psychiatry/prompt.js";
import { NEUROPSYCHIATRY_PROMPT } from "./neuropsychiatry/prompt.js";
import { ADDICTION_MEDICINE_PROMPT } from "./addiction-medicine/prompt.js";

// ─── Emergency & Critical Care ────────────────────────────────────────────────
import { EMERGENCY_MEDICINE_PROMPT } from "./emergency-medicine/prompt.js";
import { CRITICAL_CARE_PROMPT } from "./critical-care/prompt.js";
import { TRAUMA_SURGERY_PROMPT } from "./trauma-surgery/prompt.js";
import { ANESTHESIOLOGY_PROMPT } from "./anesthesiology/prompt.js";

// ─── Diagnostic Specialties ───────────────────────────────────────────────────
import { RADIOLOGY_PROMPT } from "./radiology/prompt.js";
import { PATHOLOGY_PROMPT } from "./pathology/prompt.js";
import { CLINICAL_LABORATORY_PROMPT } from "./clinical-laboratory/prompt.js";
import { NUCLEAR_MEDICINE_PROMPT } from "./nuclear-medicine/prompt.js";

// ─── Rehabilitation ───────────────────────────────────────────────────────────
import { PHYSICAL_REHABILITATION_PROMPT } from "./physical-rehabilitation/prompt.js";
import { SPORTS_MEDICINE_PROMPT } from "./sports-medicine/prompt.js";
import { PAIN_MANAGEMENT_PROMPT } from "./pain-management/prompt.js";

// ─── Other ────────────────────────────────────────────────────────────────────
import { PALLIATIVE_CARE_PROMPT } from "./palliative-care/prompt.js";
import { OCCUPATIONAL_MEDICINE_PROMPT } from "./occupational-medicine/prompt.js";
import { PREVENTIVE_MEDICINE_PROMPT } from "./preventive-medicine/prompt.js";
import { MEDICAL_GENETICS_PROMPT } from "./medical-genetics/prompt.js";
import { NEONATOLOGY_PROMPT } from "./neonatology/prompt.js";

/**
 * Complete map of Specialty → system prompt string.
 * TypeScript enforces exhaustiveness — a missing entry is a compile error.
 */
const SPECIALIST_PROMPTS: Record<Specialty, string> = {
  // Primary Care
  [Specialty.GENERAL_MEDICINE]: GENERAL_MEDICINE_PROMPT,
  [Specialty.INTERNAL_MEDICINE]: INTERNAL_MEDICINE_PROMPT,
  [Specialty.PEDIATRICS]: PEDIATRICS_PROMPT,
  [Specialty.GERIATRICS]: GERIATRICS_PROMPT,

  // Surgical
  [Specialty.GENERAL_SURGERY]: GENERAL_SURGERY_PROMPT,
  [Specialty.ORTHOPEDIC_SURGERY]: ORTHOPEDIC_SURGERY_PROMPT,
  [Specialty.NEUROSURGERY]: NEUROSURGERY_PROMPT,
  [Specialty.CARDIOTHORACIC_SURGERY]: CARDIOTHORACIC_SURGERY_PROMPT,
  [Specialty.PLASTIC_SURGERY]: PLASTIC_SURGERY_PROMPT,
  [Specialty.VASCULAR_SURGERY]: VASCULAR_SURGERY_PROMPT,
  [Specialty.OPHTHALMOLOGIC_SURGERY]: OPHTHALMOLOGIC_SURGERY_PROMPT,
  [Specialty.ENT]: ENT_PROMPT,
  [Specialty.UROLOGY]: UROLOGY_PROMPT,
  [Specialty.COLORECTAL_SURGERY]: COLORECTAL_SURGERY_PROMPT,

  // Medical
  [Specialty.CARDIOLOGY]: CARDIOLOGY_PROMPT,
  [Specialty.NEUROLOGY]: NEUROLOGY_PROMPT,
  [Specialty.GASTROENTEROLOGY]: GASTROENTEROLOGY_PROMPT,
  [Specialty.PULMONOLOGY]: PULMONOLOGY_PROMPT,
  [Specialty.NEPHROLOGY]: NEPHROLOGY_PROMPT,
  [Specialty.ENDOCRINOLOGY]: ENDOCRINOLOGY_PROMPT,
  [Specialty.RHEUMATOLOGY]: RHEUMATOLOGY_PROMPT,
  [Specialty.HEMATOLOGY]: HEMATOLOGY_PROMPT,
  [Specialty.ONCOLOGY]: ONCOLOGY_PROMPT,
  [Specialty.INFECTIOUS_DISEASES]: INFECTIOUS_DISEASES_PROMPT,
  [Specialty.DERMATOLOGY]: DERMATOLOGY_PROMPT,
  [Specialty.ALLERGY_IMMUNOLOGY]: ALLERGY_IMMUNOLOGY_PROMPT,

  // Women's Health
  [Specialty.OB_GYN]: OB_GYN_PROMPT,
  [Specialty.REPRODUCTIVE_MEDICINE]: REPRODUCTIVE_MEDICINE_PROMPT,
  [Specialty.MATERNAL_FETAL_MEDICINE]: MATERNAL_FETAL_MEDICINE_PROMPT,

  // Mental Health
  [Specialty.PSYCHIATRY]: PSYCHIATRY_PROMPT,
  [Specialty.NEUROPSYCHIATRY]: NEUROPSYCHIATRY_PROMPT,
  [Specialty.ADDICTION_MEDICINE]: ADDICTION_MEDICINE_PROMPT,

  // Emergency & Critical Care
  [Specialty.EMERGENCY_MEDICINE]: EMERGENCY_MEDICINE_PROMPT,
  [Specialty.CRITICAL_CARE]: CRITICAL_CARE_PROMPT,
  [Specialty.TRAUMA_SURGERY]: TRAUMA_SURGERY_PROMPT,
  [Specialty.ANESTHESIOLOGY]: ANESTHESIOLOGY_PROMPT,

  // Diagnostic
  [Specialty.RADIOLOGY]: RADIOLOGY_PROMPT,
  [Specialty.PATHOLOGY]: PATHOLOGY_PROMPT,
  [Specialty.CLINICAL_LABORATORY]: CLINICAL_LABORATORY_PROMPT,
  [Specialty.NUCLEAR_MEDICINE]: NUCLEAR_MEDICINE_PROMPT,

  // Rehabilitation
  [Specialty.PHYSICAL_REHABILITATION]: PHYSICAL_REHABILITATION_PROMPT,
  [Specialty.SPORTS_MEDICINE]: SPORTS_MEDICINE_PROMPT,
  [Specialty.PAIN_MANAGEMENT]: PAIN_MANAGEMENT_PROMPT,

  // Other
  [Specialty.PALLIATIVE_CARE]: PALLIATIVE_CARE_PROMPT,
  [Specialty.OCCUPATIONAL_MEDICINE]: OCCUPATIONAL_MEDICINE_PROMPT,
  [Specialty.PREVENTIVE_MEDICINE]: PREVENTIVE_MEDICINE_PROMPT,
  [Specialty.MEDICAL_GENETICS]: MEDICAL_GENETICS_PROMPT,
  [Specialty.NEONATOLOGY]: NEONATOLOGY_PROMPT,
};

/**
 * Returns the system prompt for the given specialty.
 * Throws if the specialty is not registered — this is a programming error.
 */
export function getSpecialistPrompt(specialty: Specialty): string {
  const prompt = SPECIALIST_PROMPTS[specialty];
  if (!prompt) {
    throw new Error(
      `No prompt registered for specialty: ${specialty}. ` +
        `Add a prompt file and register it in specialists/index.ts.`,
    );
  }
  return prompt;
}
