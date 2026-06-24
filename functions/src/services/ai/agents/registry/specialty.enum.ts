/**
 * Medical Specialty Registry
 * Single source of truth for all supported medical specialties.
 * Adding a new specialty requires:
 *   1. Adding an entry to `Specialty` enum
 *   2. Creating `specialists/{name}/prompt.ts`
 *   3. Adding a line to `specialists/index.ts`
 *   4. Adding metadata here in `SPECIALTY_META`
 */

export enum Specialty {
  // Primary Care
  GENERAL_MEDICINE = "general_medicine",
  INTERNAL_MEDICINE = "internal_medicine",
  PEDIATRICS = "pediatrics",
  GERIATRICS = "geriatrics",

  // Surgical Specialties
  GENERAL_SURGERY = "general_surgery",
  ORTHOPEDIC_SURGERY = "orthopedic_surgery",
  NEUROSURGERY = "neurosurgery",
  CARDIOTHORACIC_SURGERY = "cardiothoracic_surgery",
  PLASTIC_SURGERY = "plastic_surgery",
  VASCULAR_SURGERY = "vascular_surgery",
  OPHTHALMOLOGIC_SURGERY = "ophthalmologic_surgery",
  ENT = "ent",
  UROLOGY = "urology",
  COLORECTAL_SURGERY = "colorectal_surgery",

  // Medical Specialties
  CARDIOLOGY = "cardiology",
  NEUROLOGY = "neurology",
  GASTROENTEROLOGY = "gastroenterology",
  PULMONOLOGY = "pulmonology",
  NEPHROLOGY = "nephrology",
  ENDOCRINOLOGY = "endocrinology",
  RHEUMATOLOGY = "rheumatology",
  HEMATOLOGY = "hematology",
  ONCOLOGY = "oncology",
  INFECTIOUS_DISEASES = "infectious_diseases",
  DERMATOLOGY = "dermatology",
  ALLERGY_IMMUNOLOGY = "allergy_immunology",

  // Women's Health
  OB_GYN = "ob_gyn",
  REPRODUCTIVE_MEDICINE = "reproductive_medicine",
  MATERNAL_FETAL_MEDICINE = "maternal_fetal_medicine",

  // Mental Health
  PSYCHIATRY = "psychiatry",
  NEUROPSYCHIATRY = "neuropsychiatry",
  ADDICTION_MEDICINE = "addiction_medicine",

  // Emergency & Critical Care
  EMERGENCY_MEDICINE = "emergency_medicine",
  CRITICAL_CARE = "critical_care",
  TRAUMA_SURGERY = "trauma_surgery",
  ANESTHESIOLOGY = "anesthesiology",

  // Diagnostic Specialties
  RADIOLOGY = "radiology",
  PATHOLOGY = "pathology",
  CLINICAL_LABORATORY = "clinical_laboratory",
  NUCLEAR_MEDICINE = "nuclear_medicine",

  // Rehabilitation
  PHYSICAL_REHABILITATION = "physical_rehabilitation",
  SPORTS_MEDICINE = "sports_medicine",
  PAIN_MANAGEMENT = "pain_management",

  // Other
  PALLIATIVE_CARE = "palliative_care",
  OCCUPATIONAL_MEDICINE = "occupational_medicine",
  PREVENTIVE_MEDICINE = "preventive_medicine",
  MEDICAL_GENETICS = "medical_genetics",
  NEONATOLOGY = "neonatology",
}

export enum SpecialtyGroup {
  PRIMARY_CARE = "Primary Care",
  SURGICAL = "Surgical Specialties",
  MEDICAL = "Medical Specialties",
  WOMENS_HEALTH = "Women's Health",
  MENTAL_HEALTH = "Mental Health",
  EMERGENCY = "Emergency & Critical Care",
  DIAGNOSTIC = "Diagnostic Specialties",
  REHABILITATION = "Rehabilitation",
  OTHER = "Other",
}

export interface SpecialtyMeta {
  /** Human-readable label */
  label: string;
  /** Specialty group classification */
  group: SpecialtyGroup;
  /**
   * Model tier.
   * 'pro'  — high-stakes clinical decisions (cardiac, oncology, neuro, emergency)
   * 'fast' — interpretive/structural queries (labs, imaging, dermatology, rehab)
   */
  model: "pro" | "fast";
  /** One-line description used in the router tool's enum `.describe()` */
  description: string;
}

export const SPECIALTY_META: Record<Specialty, SpecialtyMeta> = {
  // ─── Primary Care ──────────────────────────────────────────────────────
  [Specialty.GENERAL_MEDICINE]: {
    label: "General Medicine",
    group: SpecialtyGroup.PRIMARY_CARE,
    model: "fast",
    description:
      "Symptoms, common conditions, preventive care, general health advice",
  },
  [Specialty.INTERNAL_MEDICINE]: {
    label: "Internal Medicine",
    group: SpecialtyGroup.PRIMARY_CARE,
    model: "fast",
    description:
      "Adult complex conditions, multi-system disease, inpatient medicine",
  },
  [Specialty.PEDIATRICS]: {
    label: "Pediatrics",
    group: SpecialtyGroup.PRIMARY_CARE,
    model: "pro",
    description:
      "Child health, growth milestones, pediatric conditions, vaccinations",
  },
  [Specialty.GERIATRICS]: {
    label: "Geriatrics",
    group: SpecialtyGroup.PRIMARY_CARE,
    model: "fast",
    description: "Elderly care, age-related conditions, polypharmacy, frailty",
  },

  // ─── Surgical Specialties ──────────────────────────────────────────────
  [Specialty.GENERAL_SURGERY]: {
    label: "General Surgery",
    group: SpecialtyGroup.SURGICAL,
    model: "pro",
    description:
      "Surgical procedures, post-operative care, hernias, appendix, gallbladder",
  },
  [Specialty.ORTHOPEDIC_SURGERY]: {
    label: "Orthopedic Surgery",
    group: SpecialtyGroup.SURGICAL,
    model: "pro",
    description:
      "Bone, joint, muscle, tendon, ligament conditions and orthopedic surgery",
  },
  [Specialty.NEUROSURGERY]: {
    label: "Neurosurgery",
    group: SpecialtyGroup.SURGICAL,
    model: "pro",
    description:
      "Brain, spinal cord, peripheral nerve surgical conditions and procedures",
  },
  [Specialty.CARDIOTHORACIC_SURGERY]: {
    label: "Cardiothoracic Surgery",
    group: SpecialtyGroup.SURGICAL,
    model: "pro",
    description: "Heart, lung, and chest wall surgical conditions",
  },
  [Specialty.PLASTIC_SURGERY]: {
    label: "Plastic & Reconstructive Surgery",
    group: SpecialtyGroup.SURGICAL,
    model: "fast",
    description: "Reconstructive, cosmetic, and wound repair surgery",
  },
  [Specialty.VASCULAR_SURGERY]: {
    label: "Vascular Surgery",
    group: SpecialtyGroup.SURGICAL,
    model: "pro",
    description:
      "Arterial, venous, and lymphatic vessel conditions and surgeries",
  },
  [Specialty.OPHTHALMOLOGIC_SURGERY]: {
    label: "Ophthalmologic Surgery",
    group: SpecialtyGroup.SURGICAL,
    model: "fast",
    description:
      "Eye conditions, vision, cataract, retinal, and ocular surgeries",
  },
  [Specialty.ENT]: {
    label: "ENT (Otolaryngology)",
    group: SpecialtyGroup.SURGICAL,
    model: "fast",
    description: "Ear, nose, throat, head and neck conditions and surgeries",
  },
  [Specialty.UROLOGY]: {
    label: "Urology",
    group: SpecialtyGroup.SURGICAL,
    model: "fast",
    description:
      "Urinary tract, kidney, bladder, prostate, and male reproductive conditions",
  },
  [Specialty.COLORECTAL_SURGERY]: {
    label: "Colorectal Surgery",
    group: SpecialtyGroup.SURGICAL,
    model: "fast",
    description: "Colon, rectum, anus conditions and colorectal surgeries",
  },

  // ─── Medical Specialties ───────────────────────────────────────────────
  [Specialty.CARDIOLOGY]: {
    label: "Cardiology",
    group: SpecialtyGroup.MEDICAL,
    model: "pro",
    description:
      "Heart disease, arrhythmias, heart failure, ECG interpretation, cardiac risk",
  },
  [Specialty.NEUROLOGY]: {
    label: "Neurology",
    group: SpecialtyGroup.MEDICAL,
    model: "pro",
    description:
      "Brain, spinal cord, neurological disorders, stroke, epilepsy, headaches",
  },
  [Specialty.GASTROENTEROLOGY]: {
    label: "Gastroenterology",
    group: SpecialtyGroup.MEDICAL,
    model: "fast",
    description: "Digestive system, liver, pancreas, GI conditions",
  },
  [Specialty.PULMONOLOGY]: {
    label: "Pulmonology",
    group: SpecialtyGroup.MEDICAL,
    model: "fast",
    description:
      "Lung diseases, respiratory conditions, asthma, COPD, sleep apnea",
  },
  [Specialty.NEPHROLOGY]: {
    label: "Nephrology",
    group: SpecialtyGroup.MEDICAL,
    model: "pro",
    description:
      "Kidney disease, CKD, dialysis, electrolyte disorders, hypertension",
  },
  [Specialty.ENDOCRINOLOGY]: {
    label: "Endocrinology & Diabetology",
    group: SpecialtyGroup.MEDICAL,
    model: "fast",
    description: "Diabetes, thyroid, hormonal disorders, metabolic conditions",
  },
  [Specialty.RHEUMATOLOGY]: {
    label: "Rheumatology",
    group: SpecialtyGroup.MEDICAL,
    model: "fast",
    description:
      "Autoimmune, inflammatory joint, muscle, and connective tissue disorders",
  },
  [Specialty.HEMATOLOGY]: {
    label: "Hematology",
    group: SpecialtyGroup.MEDICAL,
    model: "pro",
    description:
      "Blood disorders, anemia, clotting disorders, leukemia, lymphoma",
  },
  [Specialty.ONCOLOGY]: {
    label: "Oncology",
    group: SpecialtyGroup.MEDICAL,
    model: "pro",
    description:
      "Cancer diagnosis, staging, treatment options, chemotherapy, supportive oncology",
  },
  [Specialty.INFECTIOUS_DISEASES]: {
    label: "Infectious Diseases",
    group: SpecialtyGroup.MEDICAL,
    model: "pro",
    description:
      "Bacterial, viral, fungal, parasitic infections, antimicrobial therapy",
  },
  [Specialty.DERMATOLOGY]: {
    label: "Dermatology",
    group: SpecialtyGroup.MEDICAL,
    model: "fast",
    description:
      "Skin, hair, nail conditions, rashes, lesions, dermatological diseases",
  },
  [Specialty.ALLERGY_IMMUNOLOGY]: {
    label: "Allergy & Immunology",
    group: SpecialtyGroup.MEDICAL,
    model: "fast",
    description:
      "Allergies, asthma, immune deficiencies, hypersensitivity reactions",
  },

  // ─── Women's Health ────────────────────────────────────────────────────
  [Specialty.OB_GYN]: {
    label: "Obstetrics & Gynecology",
    group: SpecialtyGroup.WOMENS_HEALTH,
    model: "pro",
    description:
      "Pregnancy, childbirth, gynecological conditions, menstrual and pelvic health",
  },
  [Specialty.REPRODUCTIVE_MEDICINE]: {
    label: "Reproductive Medicine & Fertility",
    group: SpecialtyGroup.WOMENS_HEALTH,
    model: "fast",
    description: "Infertility, IVF, reproductive health, hormonal evaluation",
  },
  [Specialty.MATERNAL_FETAL_MEDICINE]: {
    label: "Maternal-Fetal Medicine",
    group: SpecialtyGroup.WOMENS_HEALTH,
    model: "pro",
    description:
      "High-risk pregnancy, fetal anomalies, perinatology, maternal complications",
  },

  // ─── Mental Health ─────────────────────────────────────────────────────
  [Specialty.PSYCHIATRY]: {
    label: "Psychiatry",
    group: SpecialtyGroup.MENTAL_HEALTH,
    model: "pro",
    description:
      "Mental health disorders, depression, anxiety, schizophrenia, psychopharmacology",
  },
  [Specialty.NEUROPSYCHIATRY]: {
    label: "Neuropsychiatry",
    group: SpecialtyGroup.MENTAL_HEALTH,
    model: "pro",
    description:
      "Neurological-psychiatric interface, cognitive disorders, brain-behavior relationship",
  },
  [Specialty.ADDICTION_MEDICINE]: {
    label: "Addiction Medicine",
    group: SpecialtyGroup.MENTAL_HEALTH,
    model: "pro",
    description:
      "Substance use disorders, detox protocols, recovery planning, behavioral addiction",
  },

  // ─── Emergency & Critical Care ─────────────────────────────────────────
  [Specialty.EMERGENCY_MEDICINE]: {
    label: "Emergency Medicine",
    group: SpecialtyGroup.EMERGENCY,
    model: "pro",
    description:
      "Acute emergencies, triage, urgent symptoms, immediate care guidance",
  },
  [Specialty.CRITICAL_CARE]: {
    label: "Intensive Care / Critical Care Medicine",
    group: SpecialtyGroup.EMERGENCY,
    model: "pro",
    description:
      "ICU management, multi-organ failure, life support, sepsis, ventilation",
  },
  [Specialty.TRAUMA_SURGERY]: {
    label: "Trauma Surgery",
    group: SpecialtyGroup.EMERGENCY,
    model: "pro",
    description:
      "Physical trauma, injury assessment, damage control surgery, polytrauma",
  },
  [Specialty.ANESTHESIOLOGY]: {
    label: "Anesthesiology",
    group: SpecialtyGroup.EMERGENCY,
    model: "pro",
    description:
      "Anesthesia, perioperative care, pain procedures, sedation protocols",
  },

  // ─── Diagnostic Specialties ────────────────────────────────────────────
  [Specialty.RADIOLOGY]: {
    label: "Radiology & Imaging",
    group: SpecialtyGroup.DIAGNOSTIC,
    model: "fast",
    description:
      "X-ray, CT, MRI, ultrasound interpretation, imaging findings and recommendations",
  },
  [Specialty.PATHOLOGY]: {
    label: "Pathology",
    group: SpecialtyGroup.DIAGNOSTIC,
    model: "fast",
    description:
      "Tissue biopsy interpretation, histopathology, disease diagnosis via samples",
  },
  [Specialty.CLINICAL_LABORATORY]: {
    label: "Clinical Laboratory Medicine",
    group: SpecialtyGroup.DIAGNOSTIC,
    model: "fast",
    description:
      "Lab result interpretation, blood panels, urinalysis, microbiology, reference ranges",
  },
  [Specialty.NUCLEAR_MEDICINE]: {
    label: "Nuclear Medicine",
    group: SpecialtyGroup.DIAGNOSTIC,
    model: "fast",
    description:
      "Nuclear imaging, PET scans, radioactive isotope diagnostics and therapy",
  },

  // ─── Rehabilitation ────────────────────────────────────────────────────
  [Specialty.PHYSICAL_REHABILITATION]: {
    label: "Physical Medicine & Rehabilitation",
    group: SpecialtyGroup.REHABILITATION,
    model: "fast",
    description:
      "Functional recovery, disability management, rehabilitation medicine, prosthetics",
  },
  [Specialty.SPORTS_MEDICINE]: {
    label: "Sports Medicine",
    group: SpecialtyGroup.REHABILITATION,
    model: "fast",
    description:
      "Athletic injuries, exercise-related conditions, performance, concussion management",
  },
  [Specialty.PAIN_MANAGEMENT]: {
    label: "Pain Management",
    group: SpecialtyGroup.REHABILITATION,
    model: "fast",
    description:
      "Chronic pain, acute pain syndromes, interventional pain procedures, opioid management",
  },

  // ─── Other ─────────────────────────────────────────────────────────────
  [Specialty.PALLIATIVE_CARE]: {
    label: "Palliative Care",
    group: SpecialtyGroup.OTHER,
    model: "pro",
    description:
      "End-of-life care, symptom relief, comfort care, hospice guidance, goals of care",
  },
  [Specialty.OCCUPATIONAL_MEDICINE]: {
    label: "Occupational Medicine",
    group: SpecialtyGroup.OTHER,
    model: "fast",
    description:
      "Work-related injuries, occupational hazards, fitness-for-duty, disability evaluation",
  },
  [Specialty.PREVENTIVE_MEDICINE]: {
    label: "Preventive Medicine",
    group: SpecialtyGroup.OTHER,
    model: "fast",
    description:
      "Disease prevention, health screening, immunization, lifestyle medicine",
  },
  [Specialty.MEDICAL_GENETICS]: {
    label: "Genomics & Medical Genetics",
    group: SpecialtyGroup.OTHER,
    model: "pro",
    description:
      "Genetic disorders, hereditary conditions, genetic counseling, genomic medicine",
  },
  [Specialty.NEONATOLOGY]: {
    label: "Neonatology",
    group: SpecialtyGroup.OTHER,
    model: "pro",
    description:
      "Newborn care, premature infants, neonatal conditions, NICU management",
  },
};
