import { tool, zodSchema } from "ai";
import { z } from "zod";
import { CreateSoapNoteUseCase } from "@/data/soap-notes";
import { CreateAssessmentUseCase } from "@/data/assessments";
import { CreateVitalUseCase } from "@/data/vitals";
import { profileRepository } from "@/data/profile";
import { dependentRepository } from "@/data/dependents";

// Each tool has an execute() that returns a simple acknowledgement.
// This is required so the model receives a tool result and continues
// generating follow-up questions / assessment text in the same response.

// ── Condition ─────────────────────────────────────────────────────────────────
export const recordConditionTool = tool({
  description:
    "Record a medical condition or diagnosis identified during the assessment. Call this when you have enough information to identify a potential condition.",
  inputSchema: zodSchema(
    z.object({
      name: z.string().describe("Name of the condition or diagnosis"),
      icd10: z.string().optional().describe("ICD-10 code if applicable"),
      severity: z
        .enum(["mild", "moderate", "severe", "critical"])
        .describe("Severity level"),
      status: z
        .enum(["suspected", "probable", "confirmed"])
        .describe("Confidence level in this condition"),
      description: z
        .string()
        .describe("Brief clinical description and reasoning"),
      symptoms: z
        .array(z.string())
        .describe("Symptoms supporting this condition"),
    }),
  ),
  execute: async ({ name }) => ({ recorded: true, condition: name }),
});

// ── Prescription ──────────────────────────────────────────────────────────────
export const createPrescriptionTool = tool({
  description:
    "Create a prescription recommendation with one or more medications. Use after identifying a condition that warrants medication.",
  inputSchema: zodSchema(
    z.object({
      title: z.string().describe("Prescription title / indication"),
      condition: z.string().describe("Condition being treated"),
      medications: z.array(
        z.object({
          name: z.string().describe("Medication name (generic or brand)"),
          dosage: z.string().describe("Dosage amount (e.g. 500mg)"),
          form: z
            .enum([
              "tablet",
              "capsule",
              "liquid",
              "injection",
              "topical",
              "inhaler",
              "drops",
              "patch",
            ])
            .describe("Drug form"),
          frequency: z.string().describe("How often (e.g. twice daily)"),
          duration: z.string().describe("Treatment duration (e.g. 7 days)"),
          instructions: z.string().optional().describe("Special instructions"),
        }),
      ),
      notes: z.string().optional().describe("Additional prescriber notes"),
      urgent: z
        .boolean()
        .optional()
        .describe("Whether this medication is urgent"),
    }),
  ),
  execute: async ({ title }) => ({ recorded: true, prescription: title }),
});

// ── Medicine (single) ─────────────────────────────────────────────────────────
export const addMedicineTool = tool({
  description:
    "Recommend a single OTC or supplemental medicine for symptom relief.",
  inputSchema: zodSchema(
    z.object({
      name: z.string(),
      category: z
        .enum(["OTC", "supplement", "herbal", "probiotic"])
        .describe("Category"),
      indication: z.string().describe("What it treats or helps with"),
      dosage: z.string(),
      frequency: z.string(),
      duration: z.string().optional(),
      warnings: z
        .array(z.string())
        .optional()
        .describe("Key warnings or contraindications"),
      notes: z.string().optional(),
    }),
  ),
  execute: async ({ name }) => ({ recorded: true, medicine: name }),
});

// ── Procedure ─────────────────────────────────────────────────────────────────
export const orderProcedureTool = tool({
  description:
    "Order a diagnostic test or medical procedure (lab, imaging, biopsy, etc.).",
  inputSchema: zodSchema(
    z.object({
      name: z.string().describe("Procedure or test name"),
      type: z
        .enum([
          "lab",
          "imaging",
          "biopsy",
          "endoscopy",
          "cardiac",
          "pulmonary",
          "neurological",
          "other",
        ])
        .describe("Type of procedure"),
      priority: z
        .enum(["routine", "urgent", "stat"])
        .describe("Priority level"),
      indication: z.string().describe("Clinical reason for ordering"),
      preparation: z
        .string()
        .optional()
        .describe("Patient preparation instructions"),
      notes: z.string().optional(),
    }),
  ),
  execute: async ({ name }) => ({ recorded: true, procedure: name }),
});

// ── Appointment ───────────────────────────────────────────────────────────────
export const bookAppointmentTool = tool({
  description:
    "Book or recommend an appointment with a healthcare provider based on the assessment.",
  inputSchema: zodSchema(
    z.object({
      specialty: z
        .enum([
          "General Practice",
          "Internal Medicine",
          "Cardiology",
          "Dermatology",
          "Neurology",
          "Orthopedics",
          "Pediatrics",
          "Psychiatry",
          "Oncology",
          "Pulmonology",
          "Gastroenterology",
          "Endocrinology",
          "Rheumatology",
          "Urology",
          "Ophthalmology",
          "ENT",
          "Emergency Medicine",
        ])
        .describe("Medical specialty required"),
      urgency: z
        .enum([
          "within 24 hours",
          "within 3 days",
          "within 1 week",
          "within 1 month",
          "routine",
        ])
        .describe("How soon the appointment is needed"),
      reason: z.string().describe("Reason for the appointment"),
      visitType: z
        .enum(["in-person", "telehealth", "either"])
        .default("either"),
      notes: z.string().optional(),
    }),
  ),
  execute: async ({ specialty }) => ({
    recorded: true,
    appointment: specialty,
  }),
});

// ── Provider ──────────────────────────────────────────────────────────────────
export const recommendProviderTool = tool({
  description:
    "Recommend a type of healthcare provider the patient should see.",
  inputSchema: zodSchema(
    z.object({
      role: z
        .enum([
          "Primary Care Physician",
          "Specialist",
          "Emergency Room",
          "Urgent Care",
          "Nurse Practitioner",
          "Pharmacist",
          "Physical Therapist",
          "Mental Health Counselor",
          "Dietitian",
          "Cardiologist",
          "Dermatologist",
          "Neurologist",
          "Orthopedic Surgeon",
          "Pediatrician",
          "Psychiatrist",
        ])
        .describe("Provider role"),
      specialty: z
        .string()
        .optional()
        .describe("Specific specialty if applicable"),
      reason: z.string().describe("Why this provider is recommended"),
      urgency: z
        .enum(["immediately", "soon", "routine"])
        .describe("Urgency level"),
      notes: z.string().optional(),
    }),
  ),
  execute: async ({ role }) => ({ recorded: true, provider: role }),
});

// ── Complete Assessment ────────────────────────────────────────────────────────
export const completeAssessmentTool = tool({
  description:
    "Call this tool when the assessment is complete. Provide a comprehensive summary of findings.",
  inputSchema: zodSchema(
    z.object({
      summary: z
        .string()
        .describe("2-3 sentence plain-language summary for the patient"),
      primaryDiagnosis: z
        .string()
        .optional()
        .describe("Most likely primary condition"),
      riskLevel: z
        .enum(["low", "moderate", "high", "emergency"])
        .describe("Overall risk level"),
      immediateActions: z
        .array(z.string())
        .describe("Immediate steps the patient should take"),
      disclaimer: z
        .string()
        .default(
          "This AI assessment is not a substitute for professional medical advice. Always consult a qualified healthcare provider.",
        ),
    }),
  ),
  execute: async () => ({ recorded: true }),
});

// ── Ask Question (interactive UI) ────────────────────────────────────────────
export const askQuestionTool = tool({
  description:
    "Ask the patient a structured clinical follow-up question. Use this for ALL follow-up questions — it renders interactive UI (Yes/No buttons, chips, or a slider) instead of plain text. Choose the type that best fits the question. PREFER single_choice or multi_choice over free_text wherever possible — only use free_text when the answer cannot be covered by a finite option list. Rules: asking about age → single_choice with options ['Under 18', '18–29', '30–44', '45–59', '60–74', '75 or older']; asking about health goals → single_choice with goal options; asking about symptoms → multi_choice with options; asking about pain level or severity → scale; asking about location/country → free_text. STANDARDISED OPTION SETS — always use these exact labels when asking about these topics: temperature → ['Normal (below 37.5°C)', 'Low-grade fever (37.5–38.5°C)', 'High fever (38.5–40°C)', 'Very high (above 40°C)', 'Haven't measured']; pain character → ['Sharp / stabbing', 'Dull / aching', 'Burning', 'Throbbing / pulsating', 'Cramping', 'Pressure / tightness']; severity → ['Mild', 'Moderate', 'Severe']; onset → ['Sudden (minutes to hours)', 'Gradual (days)', 'Chronic / ongoing (weeks or more)'].",
  inputSchema: zodSchema(
    z.object({
      question: z.string().describe("The clinical question to ask the patient"),
      type: z
        .enum(["yes_no", "single_choice", "multi_choice", "scale", "free_text"])
        .describe(
          "yes_no: binary Yes/No; single_choice: pick one option; multi_choice: pick multiple options; scale: numeric slider (e.g. pain 0-10, IPSS 0-35); free_text: open-ended text",
        ),
      options: z
        .array(z.string())
        .optional()
        .describe("Options list for single_choice or multi_choice types"),
      scaleMin: z
        .number()
        .optional()
        .describe("Minimum value for scale type (default 0)"),
      scaleMax: z
        .number()
        .optional()
        .describe("Maximum value for scale type (default 10)"),
      scaleMinLabel: z
        .string()
        .optional()
        .describe("Label for the minimum scale value (e.g. 'No symptoms')"),
      scaleMaxLabel: z
        .string()
        .optional()
        .describe("Label for the maximum scale value (e.g. 'Worst possible')"),
    }),
  ),
  execute: async ({ question }) => ({ asked: true, question }),
});

// ── Next Steps ────────────────────────────────────────────────────────────────
export const nextStepsTool = tool({
  description:
    "Show the patient a clear, prioritised action plan for what to do next after the condition has been identified. Only call this when the user explicitly requests it (e.g. taps the 'What to Do Next' chip or asks for it directly). Do NOT auto-fire it after recordCondition.",
  inputSchema: zodSchema(
    z.object({
      condition: z.string().describe("The identified condition"),
      immediate: z
        .array(z.string())
        .describe("Things to do right now (today or within 24 hours)"),
      shortTerm: z
        .array(z.string())
        .describe("Things to do in the next 1–4 weeks"),
      longTerm: z
        .array(z.string())
        .describe("Ongoing habits or follow-ups (months to years)"),
      redFlags: z
        .array(z.string())
        .describe(
          "Warning signs that mean the patient should seek emergency care immediately",
        ),
    }),
  ),
  execute: async ({ condition }) => ({ recorded: true, condition }),
});

// ── Suggest Actions ───────────────────────────────────────────────────────────
export const suggestActionsTool = tool({
  description:
    "Present action chips to let the user choose what to do next. Call this in TWO scenarios:\n\n" +
    "SCENARIO A — Condition identified from a symptom/text (call immediately after the user responds to the Health Records yes/no question, Step 1.5). Present exactly 4 chips in this fixed order: (1) label 'Medications' → message 'What medications are recommended for [condition]?', (2) label 'Suggest tests' → message 'What tests should I get for [condition]?', (3) label 'Diet advice' → message 'What diet should I follow for [condition]?', (4) label 'Continue assessment' → message 'Continue the assessment for [condition]'.\n\n" +
    "SCENARIO B — Condition identified from an uploaded test report / lab result / imaging (call immediately after recordCondition and soapNote, instead of auto-firing all tools). Present exactly 4 chips in this fixed order: (1) label 'Medications' → message 'What medications are recommended for [condition]?', (2) label 'Diet plan' → message 'What diet should I follow for [condition]?', (3) label 'Book appointment' → message 'I need an appointment recommendation for [condition]', (4) label 'Full analysis' → message 'Give me the full analysis of my [condition] test results'.\n\n" +
    "In both scenarios: nextSteps, dietPlan, createPrescription, addMedicine, bookAppointment, orderProcedure, and completeAssessment must NOT be called unless the user explicitly selects the relevant chip or asks in their own words.",
  inputSchema: zodSchema(
    z.object({
      condition: z.string().describe("The identified condition name"),
      actions: z
        .array(
          z.object({
            label: z
              .string()
              .describe("Short chip label shown to the patient (max 4 words)"),
            message: z
              .string()
              .describe(
                "The exact message to send when the patient taps this chip",
              ),
          }),
        )
        .length(4)
        .describe(
          "Exactly 4 chips: Medications, Suggest tests, Diet advice, Continue assessment",
        ),
    }),
  ),
  execute: async ({ condition }) => ({ shown: true, condition }),
});

// ── Diet Plan ─────────────────────────────────────────────────────────────────
export const dietPlanTool = tool({
  description:
    "Generate a professional, personalised 7-day (Monday–Sunday) diet plan with per-meal food items, portion weights, and calorie counts. Only call this when the user explicitly requests it. BEFORE calling this tool you MUST have collected ALL of the following via askQuestion — do NOT skip any: (1) Health goal/condition → single_choice options ['Weight loss', 'Managing diabetes', 'High blood pressure', 'Heart health', 'Digestive health (IBS / GERD)', 'Kidney disease', 'General wellness']; (2) Food preference → single_choice options ['Vegetarian', 'Non-vegetarian', 'Vegan', 'Pescatarian', 'No preference']; (3) Age range → single_choice options ['Under 18', '18–29', '30–44', '45–59', '60–74', '75 or older'] — NEVER free_text; (4) Country/region → free_text. ALSO always check the patient's existing conditions (from recordCondition calls), current medications, and most recent SOAP note in the conversation context before generating — adjust calorie targets, foods, and restrictions accordingly (e.g. avoid high-potassium foods for kidney disease, avoid high-sugar for diabetes). The plan must include 5 meals per day (Breakfast, Morning Snack, Lunch, Afternoon Snack, Dinner) with suggested times, each food item with portion weight in grams and calories, daily total calories, a realistic weekly weight-loss estimate, and practical lifestyle tips. EVERY food item MUST include: (a) weight in grams, (b) full macronutrient breakdown (protein, carbs, fat, fiber in grams), (c) a list of common allergens present (choose from: gluten, dairy, eggs, nuts, peanuts, soy, fish, shellfish, sesame — use empty array if none), and (d) dietaryType classified as 'veg' (vegetarian, may include dairy/eggs), 'non-veg' (contains meat, poultry, or seafood), or 'vegan' (no animal products whatsoever).",
  inputSchema: zodSchema(
    z.object({
      condition: z
        .string()
        .describe(
          "Health goal or condition (e.g. 'Weight loss', 'Managing diabetes')",
        ),
      overview: z
        .string()
        .describe(
          "2–3 sentence professional overview of the dietary strategy and rationale",
        ),
      weeklyWeightLossEstimate: z
        .string()
        .describe(
          "Realistic weekly weight-loss estimate e.g. '0.5–0.8 kg per week'",
        ),
      totalDailyCalories: z
        .number()
        .int()
        .describe("Target total daily calorie intake"),
      weeklyPlan: z
        .array(
          z.object({
            day: z.string().describe("Day of week e.g. 'Monday'"),
            meals: z
              .array(
                z.object({
                  name: z
                    .string()
                    .describe(
                      "Meal name: Breakfast | Morning Snack | Lunch | Afternoon Snack | Dinner",
                    ),
                  time: z
                    .string()
                    .describe("Suggested eating window e.g. '7:00–8:00 AM'"),
                  foods: z.array(
                    z.object({
                      item: z
                        .string()
                        .describe(
                          "Food name e.g. 'Oatmeal with mixed berries'",
                        ),
                      portion: z
                        .string()
                        .describe("Portion with weight e.g. '1 bowl (250 g)'"),
                      calories: z
                        .number()
                        .int()
                        .describe("Calories for this item"),
                      weight: z
                        .number()
                        .int()
                        .describe("Total weight of this food item in grams"),
                      nutrition: z
                        .object({
                          protein: z.number().describe("Protein in grams"),
                          carbs: z.number().describe("Carbohydrates in grams"),
                          fat: z.number().describe("Fat in grams"),
                          fiber: z.number().describe("Dietary fiber in grams"),
                        })
                        .describe("Macronutrient breakdown per serving"),
                      allergens: z
                        .array(z.string())
                        .describe(
                          "Common allergens present e.g. ['gluten', 'dairy', 'nuts', 'eggs', 'soy', 'shellfish', 'fish', 'peanuts', 'sesame']. Use empty array if none.",
                        ),
                      dietaryType: z
                        .enum(["veg", "non-veg", "vegan"])
                        .describe(
                          "Dietary classification: 'veg' (vegetarian, may contain dairy/eggs), 'non-veg' (contains meat, poultry, or seafood), 'vegan' (no animal products whatsoever)",
                        ),
                    }),
                  ),
                  totalCalories: z
                    .number()
                    .int()
                    .describe("Sum of calories for this meal"),
                }),
              )
              .describe("5 meals for the day"),
            totalCalories: z
              .number()
              .int()
              .describe("Sum of all meal calories for the day"),
          }),
        )
        .length(7)
        .describe("Full 7-day plan, Monday through Sunday"),
      recommended: z
        .array(
          z.object({
            food: z.string(),
            reason: z.string().describe("Why this food helps the condition"),
          }),
        )
        .describe("Key foods/food groups to eat more of"),
      avoid: z
        .array(
          z.object({
            food: z.string(),
            reason: z
              .string()
              .describe("Why this food is harmful or should be limited"),
          }),
        )
        .describe("Foods to limit or avoid"),
      tips: z
        .array(z.string())
        .describe(
          "Professional lifestyle, hydration, meal-timing, and exercise tips",
        ),
    }),
  ),
  execute: async ({ condition }) => ({ recorded: true, condition }),
});

// ── SOAP Note ─────────────────────────────────────────────────────────────────
// soapNoteTool is created via factory below so it can persist with user context.

// ── All tools export ──────────────────────────────────────────────────────────

// ── Dental Chart ──────────────────────────────────────────────────────────────
const dentalChartTool = tool({
  description:
    "Render an annotated dental chart with per-tooth findings extracted from a dental X-ray or OPG image. ONLY call this tool when an actual dental image file (OPG/panoramic, periapical, bitewing, or intraoral photo) is physically attached to the current user message — never call it based on text alone or when no image is present. If the user mentions a dental X-ray but has not attached a file, do NOT call this tool; call askQuestion to request the upload instead.",
  inputSchema: zodSchema(
    z.object({
      summary: z
        .string()
        .describe("1–2 sentence overall summary of dental findings"),
      orthodonticFindings: z
        .string()
        .optional()
        .describe(
          "Orthodontic observations such as crowding, malocclusion, spacing, skeletal relationship",
        ),
      findings: z.array(
        z.object({
          tooth: z
            .number()
            .describe(
              "FDI tooth number. Upper right: 11–18, upper left: 21–28, lower left: 31–38, lower right: 41–48",
            ),
          condition: z.enum([
            "normal",
            "caries",
            "missing",
            "crown",
            "root_canal",
            "impacted",
            "periapical_lesion",
            "watch",
            "unerupted",
            "bridge",
          ]),
          note: z
            .string()
            .optional()
            .describe("Brief clinical note for this specific tooth"),
          severity: z.enum(["mild", "moderate", "severe"]).optional(),
        }),
      ),
    }),
  ),
  execute: async (input) => ({ recorded: true, ...input }),
});

// ── PHQ-9 — Depression Screener ───────────────────────────────────────────────

/**
 * Records the result of a PHQ-9 (Patient Health Questionnaire-9) depression
 * screening. The AI collects responses to the 9 standard questions and calls
 * this tool with the total score and interpretation.
 *
 * Scoring: 0–4 none, 5–9 mild, 10–14 moderate, 15–19 mod-severe, 20–27 severe.
 */
export const phq9Tool = tool({
  description:
    "Record the result of a completed PHQ-9 depression screening. Call this after " +
    "the patient has answered all 9 PHQ-9 items. Provide the individual item scores " +
    "(0=not at all, 1=several days, 2=more than half the days, 3=nearly every day) " +
    "and the auto-computed total.",
  inputSchema: zodSchema(
    z.object({
      scores: z
        .array(z.number().int().min(0).max(3))
        .length(9)
        .describe(
          "Array of 9 item scores in standard PHQ-9 order (Q1–Q9), each 0–3",
        ),
      totalScore: z
        .number()
        .int()
        .min(0)
        .max(27)
        .describe("Sum of all 9 item scores"),
      severity: z
        .enum(["none", "mild", "moderate", "moderately_severe", "severe"])
        .describe("Severity band derived from total score"),
      functionalImpairment: z
        .enum(["not_difficult", "somewhat", "very", "extremely"])
        .optional()
        .describe("Q10 — how difficult have problems made it to function"),
      followUpRecommended: z
        .boolean()
        .describe("Whether clinical follow-up / referral is recommended"),
      notes: z.string().optional().describe("Additional clinical notes"),
    }),
  ),
  execute: async ({ totalScore, severity }) => ({
    recorded: true,
    screener: "PHQ-9",
    totalScore,
    severity,
  }),
});

// ── GAD-7 — Anxiety Screener ──────────────────────────────────────────────────

/**
 * Records the result of a GAD-7 (Generalized Anxiety Disorder-7) screening.
 *
 * Scoring: 0–4 minimal, 5–9 mild, 10–14 moderate, 15–21 severe.
 */
export const gad7Tool = tool({
  description:
    "Record the result of a completed GAD-7 anxiety screening. Call this after " +
    "the patient has answered all 7 GAD-7 items. Provide individual scores " +
    "(0=not at all, 1=several days, 2=more than half the days, 3=nearly every day) " +
    "and the auto-computed total.",
  inputSchema: zodSchema(
    z.object({
      scores: z
        .array(z.number().int().min(0).max(3))
        .length(7)
        .describe("Array of 7 item scores in standard GAD-7 order, each 0–3"),
      totalScore: z
        .number()
        .int()
        .min(0)
        .max(21)
        .describe("Sum of all 7 item scores"),
      severity: z
        .enum(["minimal", "mild", "moderate", "severe"])
        .describe("Severity band derived from total score"),
      followUpRecommended: z
        .boolean()
        .describe("Whether clinical follow-up / referral is recommended"),
      notes: z.string().optional().describe("Additional clinical notes"),
    }),
  ),
  execute: async ({ totalScore, severity }) => ({
    recorded: true,
    screener: "GAD-7",
    totalScore,
    severity,
  }),
});

// ── AUDIT-C — Alcohol Use Screener ────────────────────────────────────────────

/**
 * Records the result of an AUDIT-C (Alcohol Use Disorders Identification
 * Test — Consumption) 3-item alcohol screening.
 *
 * At-risk thresholds: ≥3 women, ≥4 men.
 */
export const auditCTool = tool({
  description:
    "Record the result of a completed AUDIT-C alcohol use screening. " +
    "Collect the 3 standard AUDIT-C items and total score.",
  inputSchema: zodSchema(
    z.object({
      q1FrequencyScore: z
        .number()
        .int()
        .min(0)
        .max(4)
        .describe(
          "Q1 — How often do you have a drink containing alcohol? (0–4)",
        ),
      q2UnitsScore: z
        .number()
        .int()
        .min(0)
        .max(4)
        .describe("Q2 — How many drinks on a typical drinking day? (0–4)"),
      q3BingeScore: z
        .number()
        .int()
        .min(0)
        .max(4)
        .describe("Q3 — How often 6+ drinks on one occasion? (0–4)"),
      totalScore: z.number().int().min(0).max(12).describe("Sum of Q1+Q2+Q3"),
      atRisk: z
        .boolean()
        .describe(
          "True if score is at/above sex-specific threshold (men ≥4, women ≥3)",
        ),
      notes: z.string().optional(),
    }),
  ),
  execute: async ({ totalScore, atRisk }) => ({
    recorded: true,
    screener: "AUDIT-C",
    totalScore,
    atRisk,
  }),
});

// ── Factory — binds soapNote execution to a specific user+session ────────────

// ── Risk Score ────────────────────────────────────────────────────────────────
export const riskScoreTool = tool({
  description:
    "Display a validated clinical risk score as a formatted card. Call this when a " +
    "risk calculation is clinically relevant: HEART score for chest pain, Framingham " +
    "CVD 10-year risk after reviewing a lipid panel (patient ≥30 yrs), BMI classification " +
    "when height and weight are both known, CKD staging when eGFR or creatinine is " +
    "available, FRAX fracture risk for osteoporosis. Compute the score first using the " +
    "validated algorithm, then call this tool.",
  inputSchema: zodSchema(
    z.object({
      name: z
        .enum([
          "HEART",
          "Framingham CVD",
          "BMI",
          "CKD Stage",
          "FRAX",
          "Charlson CCI",
          "AUDIT",
          "IPSS",
          "NYHA",
          "GOLD",
        ])
        .describe("Risk score or staging system name"),
      score: z
        .union([z.number(), z.string()])
        .describe(
          "Computed numeric score or stage label (e.g. 7, 'Stage 3a', '28.4%')",
        ),
      riskCategory: z
        .enum(["low", "moderate", "high", "very_high", "emergency"])
        .describe("Risk category derived from the score"),
      interpretation: z
        .string()
        .describe(
          "Plain-language interpretation of what the score means for this patient",
        ),
      components: z
        .array(
          z.object({
            label: z
              .string()
              .describe("Score component name (e.g. 'History', 'ECG', 'Age')"),
            value: z
              .union([z.string(), z.number()])
              .describe("Patient's value for this component"),
            points: z
              .number()
              .optional()
              .describe("Points contributed to the total score"),
          }),
        )
        .optional()
        .describe("Individual scoring components broken down for transparency"),
      guideline: z
        .string()
        .describe(
          "Guideline or source (e.g. 'AHA/ACC 2019', 'KDIGO 2024', 'WHO')",
        ),
      recommendation: z
        .string()
        .describe(
          "Guideline-recommended next step based on this score category",
        ),
    }),
  ),
  execute: async ({ name, score, riskCategory }) => ({
    recorded: true,
    riskScore: name,
    score,
    riskCategory,
  }),
});

// ── Drug Interaction Alert ─────────────────────────────────────────────────────
export const drugInteractionTool = tool({
  description:
    "Flag clinically significant drug-drug or drug-condition interactions. Call this " +
    "immediately after createPrescription or addMedicine when the patient has existing " +
    "active medications in PATIENT HEALTH HISTORY. Only call if at least one interaction " +
    "is identified — do NOT call just to confirm 'no interactions found'.",
  inputSchema: zodSchema(
    z.object({
      interactions: z
        .array(
          z.object({
            drug1: z.string().describe("First drug or substance"),
            drug2: z
              .string()
              .describe(
                "Second drug, substance, or condition interacting with drug1",
              ),
            severity: z
              .enum(["minor", "moderate", "major", "contraindicated"])
              .describe("Clinical severity of the interaction"),
            mechanism: z
              .string()
              .describe(
                "Brief pharmacokinetic or pharmacodynamic mechanism (1 sentence)",
              ),
            clinicalEffect: z
              .string()
              .describe("What the patient might experience (plain language)"),
            management: z
              .string()
              .describe(
                "What to do — monitor, separate doses, use alternative, avoid entirely",
              ),
          }),
        )
        .min(1)
        .describe("All identified clinically significant interactions"),
      summary: z
        .string()
        .describe(
          "1–2 sentence plain-language summary of the most important interaction(s)",
        ),
      requiresPhysicianReview: z
        .boolean()
        .describe("True if any interaction is major or contraindicated"),
    }),
  ),
  execute: async ({ interactions, requiresPhysicianReview }) => ({
    recorded: true,
    interactionCount: interactions.length,
    requiresPhysicianReview,
  }),
});

// ── Vaccination Review ─────────────────────────────────────────────────────────
export const vaccinationReviewTool = tool({
  description:
    "Review the patient's immunisation status and flag gaps or overdue vaccines. " +
    "Call this when: (a) the user asks about vaccines/immunisations, (b) a condition " +
    "is identified that changes vaccination requirements (diabetes, asthma, COPD, " +
    "immunosuppression, CKD, asplenia), (c) the user is preparing for travel. " +
    "Base recommendations on WHO + ACIP schedules adjusted for age, country, and conditions.",
  inputSchema: zodSchema(
    z.object({
      ageGroup: z
        .string()
        .describe(
          "Patient age group (e.g. 'Adult 19–49', 'Child under 5', 'Older adult 65+')",
        ),
      recommended: z
        .array(
          z.object({
            vaccine: z
              .string()
              .describe(
                "Vaccine name (e.g. 'Influenza', 'Pneumococcal PCV15', 'HPV')",
              ),
            indication: z
              .string()
              .describe(
                "Why it is recommended for this patient (age, condition, travel, etc.)",
              ),
            schedule: z
              .string()
              .describe(
                "Dosing schedule (e.g. 'Annual', '2-dose series 6 months apart')",
              ),
            urgency: z
              .enum(["routine", "recommended", "high_priority"])
              .describe("Priority level for this patient"),
          }),
        )
        .describe("Vaccines that should be discussed or administered"),
      upToDate: z
        .array(z.string())
        .optional()
        .describe("Vaccines the patient is already current on, if known"),
      travelVaccines: z
        .array(
          z.object({
            vaccine: z.string(),
            destination: z.string(),
            minimumLeadTime: z
              .string()
              .optional()
              .describe(
                "How far in advance to get vaccinated (e.g. '4–6 weeks before travel')",
              ),
          }),
        )
        .optional()
        .describe("Additional vaccines recommended for travel destinations"),
      notes: z
        .string()
        .describe(
          "Key considerations — contraindications, live vaccine precautions, etc.",
        ),
    }),
  ),
  execute: async ({ recommended }) => ({
    recorded: true,
    vaccineCount: recommended.length,
  }),
});

// ── Symptom Timeline ──────────────────────────────────────────────────────────
export const symptomTimelineTool = tool({
  description:
    "Log and display a visual timeline of symptom episodes for recurring or episodic " +
    "conditions (migraines, GERD, asthma, joint flares, mood episodes, seizures). " +
    "Call when the patient has described ≥2 episodes with enough timing or trigger detail. " +
    "The pattern field should summarise what the timeline reveals — e.g. " +
    "'Episodes cluster every 3–4 weeks, often triggered by stress and poor sleep'.",
  inputSchema: zodSchema(
    z.object({
      condition: z.string().describe("The recurring condition being tracked"),
      events: z
        .array(
          z.object({
            date: z
              .string()
              .describe(
                "Date or timeframe of the episode (ISO-8601 or descriptive, e.g. 'last Tuesday', '3 weeks ago')",
              ),
            symptom: z
              .string()
              .describe("Primary symptom experienced during this episode"),
            severity: z
              .enum(["mild", "moderate", "severe"])
              .describe("Severity of this episode"),
            duration: z
              .string()
              .optional()
              .describe(
                "How long the episode lasted (e.g. '4 hours', '2 days')",
              ),
            triggers: z
              .array(z.string())
              .optional()
              .describe("Known or suspected triggers for this episode"),
            notes: z
              .string()
              .optional()
              .describe("Additional context the patient provided"),
          }),
        )
        .min(2)
        .describe(
          "Chronological list of symptom episodes — minimum 2 required",
        ),
      pattern: z
        .string()
        .describe(
          "Plain-language summary of the pattern, frequency, and any identified triggers",
        ),
      commonTriggers: z
        .array(z.string())
        .optional()
        .describe("Triggers that appear across multiple episodes"),
      clinicalSignificance: z
        .string()
        .describe(
          "What this pattern means clinically and what it suggests for management",
        ),
    }),
  ),
  execute: async ({ condition, events }) => ({
    recorded: true,
    condition,
    episodeCount: events.length,
  }),
});

export function createClinicalTools(ctx: {
  userId: string;
  sessionId: string;
  dependentId?: string;
}) {
  const logVitalsTool = tool({
    description:
      "Silently save vital sign measurements into the patient's Health Records. " +
      "Call this whenever the patient mentions or a report contains measurable vitals: " +
      "blood pressure, heart rate, blood glucose, oxygen saturation (SpO2), body temperature, " +
      "or respiratory rate. Extract values immediately — do NOT ask permission first. " +
      "Conversions: blood glucose mg/dL → mmol/L divide by 18; temperature °F → °C = (F−32)×5÷9. " +
      "Note the measurement context in the 'note' field (e.g. 'fasting', 'after exercise', 'at rest'). " +
      "This is a background save — do NOT announce it in text; continue directly with the clinical assessment.",
    inputSchema: zodSchema(
      z.object({
        sex: z.enum(["male", "female"]).optional().describe("Biological sex"),
        waistCm: z
          .number()
          .positive()
          .optional()
          .describe("Waist circumference in cm"),
        hipCm: z
          .number()
          .positive()
          .optional()
          .describe("Hip circumference in cm"),
        neckCm: z
          .number()
          .positive()
          .optional()
          .describe("Neck circumference in cm"),
        activityLevel: z
          .enum(["sedentary", "light", "moderate", "active", "very_active"])
          .optional()
          .describe("Physical activity level"),
        systolicBp: z
          .number()
          .int()
          .min(50)
          .max(300)
          .optional()
          .describe("Systolic BP in mmHg"),
        diastolicBp: z
          .number()
          .int()
          .min(20)
          .max(200)
          .optional()
          .describe("Diastolic BP in mmHg"),
        restingHr: z
          .number()
          .int()
          .min(20)
          .max(300)
          .optional()
          .describe("Heart rate in bpm"),
        spo2: z
          .number()
          .min(50)
          .max(100)
          .optional()
          .describe("Oxygen saturation in %"),
        temperatureC: z
          .number()
          .min(30)
          .max(45)
          .optional()
          .describe("Body temperature in °C"),
        respiratoryRate: z
          .number()
          .int()
          .min(4)
          .max(60)
          .optional()
          .describe("Respiratory rate in breaths/min"),
        glucoseMmol: z
          .number()
          .min(1)
          .max(50)
          .optional()
          .describe("Blood glucose in mmol/L"),
        note: z
          .string()
          .optional()
          .describe(
            "Measurement context (e.g. 'fasting', 'post-meal', 'resting')",
          ),
        measuredAt: z
          .string()
          .optional()
          .describe("ISO-8601 datetime of measurement; omit to default to now"),
      }),
    ),
    execute: async (input) => {
      void (async () => {
        try {
          await new CreateVitalUseCase(ctx.dependentId).execute(
            CreateVitalUseCase.validate({
              userId: ctx.userId,
              sex: input.sex,
              waistCm: input.waistCm,
              hipCm: input.hipCm,
              neckCm: input.neckCm,
              activityLevel: input.activityLevel,
              systolicBp: input.systolicBp,
              diastolicBp: input.diastolicBp,
              restingHr: input.restingHr,
              spo2: input.spo2,
              temperatureC: input.temperatureC,
              respiratoryRate: input.respiratoryRate,
              glucoseMmol: input.glucoseMmol,
              note: input.note,
              measuredAt: input.measuredAt,
            }),
          );
        } catch {
          // Non-fatal — don't interrupt the stream
        }
      })();
      return { saved: true };
    },
  });

  const soapNoteTool = tool({
    description:
      "Generate a structured SOAP note (Subjective, Objective, Assessment, Plan) summarising the clinical encounter. Only call this when the user explicitly requests it (e.g. taps the 'Clinical Summary' chip or asks for a clinical note). Do NOT auto-fire.",
    inputSchema: zodSchema(
      z.object({
        subjective: z
          .string()
          .describe(
            "Patient's reported symptoms, history, and chief complaint in plain language",
          ),
        objective: z
          .string()
          .describe(
            "Observable or measurable findings (symptoms reported, scores, any data shared)",
          ),
        assessment: z
          .string()
          .describe(
            "Clinical interpretation — probable diagnosis and reasoning, risk level",
          ),
        plan: z
          .array(z.string())
          .describe(
            "Ordered management steps: investigations, medications, referrals, and follow-up",
          ),
        condition: z.string().describe("Primary condition being assessed"),
        riskLevel: z
          .enum(["low", "moderate", "high", "emergency"])
          .describe("Overall risk level"),
      }),
    ),
    execute: async (input) => {
      void (async () => {
        try {
          await new CreateSoapNoteUseCase(ctx.dependentId).execute(
            CreateSoapNoteUseCase.validate({
              userId: ctx.userId,
              sessionId: ctx.sessionId,
              condition: input.condition,
              riskLevel: input.riskLevel,
              subjective: input.subjective,
              objective: input.objective,
              assessment: input.assessment,
              plan: input.plan,
            }),
          );
        } catch {
          // Non-fatal — don't interrupt the stream
        }
      })();
      return { recorded: true, condition: input.condition };
    },
  });

  const saveAssessmentTool = tool({
    description:
      "Save the completed clinical assessment — call this automatically after all " +
      "clinical questions have been asked and answered. Pass the full list of " +
      "question-answer pairs from this session so the patient can review their " +
      "assessment history at any time.",
    inputSchema: zodSchema(
      z.object({
        title: z
          .string()
          .describe(
            "Short descriptive title for this assessment (e.g. 'Chest Pain Assessment')",
          ),
        condition: z
          .string()
          .optional()
          .describe("Primary clinical condition or topic assessed"),
        riskLevel: z
          .enum(["low", "moderate", "high", "emergency"])
          .optional()
          .describe("Overall risk level determined during assessment"),
        summary: z
          .string()
          .optional()
          .describe(
            "1–3 sentence clinical summary of findings and recommendations",
          ),
        qa: z
          .array(
            z.object({
              question: z
                .string()
                .describe("The clinical question that was asked"),
              questionType: z
                .string()
                .describe(
                  "Type: yes_no | single_choice | multi_choice | scale | free_text",
                ),
              options: z
                .array(z.string())
                .optional()
                .describe("Answer options if applicable"),
              answer: z.string().describe("The patient's answer"),
            }),
          )
          .min(1)
          .describe("All clinical question-answer pairs from this session"),
      }),
    ),
    execute: async (input) => {
      void (async () => {
        try {
          await new CreateAssessmentUseCase(ctx.dependentId).execute(
            CreateAssessmentUseCase.validate({
              userId: ctx.userId,
              sessionId: ctx.sessionId,
              title: input.title,
              condition: input.condition,
              riskLevel: input.riskLevel,
              summary: input.summary,
              qa: input.qa,
            }),
          );
        } catch {
          // Non-fatal — don't interrupt the stream
        }
      })();
      return { saved: true, title: input.title };
    },
  });

  // ── Update Profile ──────────────────────────────────────────────────────────────
  // Used exclusively by the profile onboarding flow to persist values the
  // AI collected from the user via `askQuestion`.

  const updateProfileTool = tool({
    description:
      "Save patient profile fields collected during the onboarding questionnaire. " +
      "Call this tool ONCE after you have collected ALL missing required fields via `askQuestion`. " +
      "Do NOT call it field by field — batch all collected values into a single call. " +
      "Only call this tool when you have at least one field to save. " +
      "After saving, confirm to the user that their profile is complete and proceed with their original request.",
    inputSchema: zodSchema(
      z.object({
        dateOfBirth: z
          .string()
          .optional()
          .describe("ISO date string YYYY-MM-DD parsed from the user's answer"),
        sex: z
          .enum(["male", "female"])
          .optional()
          .describe(
            "Biological sex — map 'Male' → 'male', 'Female' → 'female'",
          ),
        height: z.number().positive().optional().describe("Height in cm"),
        weight: z.number().positive().optional().describe("Weight in kg"),
        activityLevel: z
          .enum(["sedentary", "light", "moderate", "active", "very_active"])
          .optional()
          .describe(
            "Map the user's choice: 'Sedentary…' → 'sedentary', 'Light…' → 'light', " +
              "'Moderate…' → 'moderate', 'Active…' → 'active', 'Very Active…' → 'very_active'",
          ),
        country: z.string().optional().describe("Country name"),
        city: z.string().optional().describe("City name"),
      }),
    ),
    execute: async (input) => {
      try {
        if (ctx.dependentId) {
          // Dependent profiles don't have `sex` or `activityLevel`; strip them.
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { sex, activityLevel, ...dependentFields } = input;
          await dependentRepository.update({
            ownerId: ctx.userId,
            dependentId: ctx.dependentId,
            ...dependentFields,
          });
        } else {
          await profileRepository.upsert({ userId: ctx.userId, ...input });
        }
        return {
          saved: true,
          fields: Object.keys(input).filter(
            (k) => input[k as keyof typeof input] !== undefined,
          ),
        };
      } catch {
        return { saved: false, fields: [] };
      }
    },
  });

  return {
    recordCondition: recordConditionTool,
    suggestActions: suggestActionsTool,
    createPrescription: createPrescriptionTool,
    addMedicine: addMedicineTool,
    orderProcedure: orderProcedureTool,
    bookAppointment: bookAppointmentTool,
    recommendProvider: recommendProviderTool,
    completeAssessment: completeAssessmentTool,
    askQuestion: askQuestionTool,
    nextSteps: nextStepsTool,
    dietPlan: dietPlanTool,
    soapNote: soapNoteTool,
    dentalChart: dentalChartTool,
    saveAssessment: saveAssessmentTool,
    phq9: phq9Tool,
    gad7: gad7Tool,
    auditC: auditCTool,
    logVitals: logVitalsTool,
    riskScore: riskScoreTool,
    drugInteraction: drugInteractionTool,
    vaccinationReview: vaccinationReviewTool,
    symptomTimeline: symptomTimelineTool,
    updateProfile: updateProfileTool,
  } as const;
}
