/**
 * Gateway Agent — Fast routing intelligence using Flash model
 *
 * This lightweight agent analyzes incoming requests and determines which
 * specialized clinical agent should handle them. It uses Gemini Flash for
 * sub-200 ms routing decisions via structured object extraction.
 *
 * Design philosophy:
 * - Speed-first: Flash model for instant routing decisions
 * - Context-aware: Considers attachment presence and recent conversation
 * - Not a streaming agent: returns a structured ClinicalRouting decision
 *
 * Usage:
 * ```ts
 * const decision = await gatewayAgent.decide({
 *   userQuery: "I need a diet plan for diabetes",
 *   userId: "abc123",
 * });
 * // decision.agent === "dietPlanner"
 * ```
 */

import type { FileLabel } from "@/data/files";
import { z } from "zod";
import { aiService } from "@/data/shared/service/ai.service";
import { decideRagRequirement } from "./rag-decision";
import { buildRoutingPrompt } from "./prompt";

export type { GatewayInput } from "./prompt";

// ── Fast keyword pre-routing ──────────────────────────────────────────────────

const DIET_KEYWORDS = [
  "diet plan",
  "meal plan",
  "food plan",
  "nutrition plan",
  "7 day meal",
  "7-day meal",
  "what should i eat",
  "diet chart",
  "meal suggest",
];

const PRESCRIPTION_KEYWORDS = [
  "write a prescription",
  "write prescription",
  "prescribe me",
  "medication order",
  "need a refill",
  "need refill",
  "prescription for",
];

const LAB_REPORT_KEYWORDS = [
  "blood test",
  "blood results",
  "lab results",
  "lab report",
  "test report",
  "test result",
  "biomarker",
  "marker report",
  "double marker",
  "triple marker",
  "tumor marker",
  "prenatal screening",
  "blood work",
  "blood panel",
  "cbc result",
  "lipid panel",
  "hba1c result",
  "thyroid result",
  "interpret my blood",
  "analyse my blood",
  "analyze my blood",
];

const PATIENT_KEYWORDS = [
  "my name",
  "my age",
  "my profile",
  "my weight",
  "my height",
  "my gender",
  "my email",
  "my phone",
  "my detail",
  "my info",
  "my data",
  "my blood group",
  "my bmi",
  "my body",
  "my medication",
  "my medicine",
  "my med",
  "my drug",
  "my dose",
  "my dosage",
  "what am i taking",
  "who am i",
  "about me",
  "tell me about myself",
  "my food preference",
  "my activity level",
];

const MENTAL_HEALTH_KEYWORDS = [
  "anxiety",
  "depression",
  "depressed",
  "stress",
  "stressed",
  "panic attack",
  "panic",
  "ocd",
  "ptsd",
  "trauma",
  "traumatic",
  "insomnia",
  "sleep issue",
  "sleep problem",
  "mood",
  "mood swing",
  "bipolar",
  "mental health",
  "psychol",
  "therapist",
  "counselor",
  "counselling",
  "cbt",
  "mindfulness",
  "meditation",
  "breathing exercis",
  "burnout",
  "emotional",
  "self-harm",
  "suicidal",
  "suicid",
  "phobia",
  "afraid",
  "worried",
  "worry",
  "overwhelm",
];

const NEUROLOGY_KEYWORDS = [
  "headache",
  "migraine",
  "seizure",
  "numbness",
  "tingling",
  "dizziness",
  "vertigo",
  "memory loss",
  "nerve pain",
  "neuralgia",
  "neurological",
];

const CARDIOLOGY_KEYWORDS = [
  "chest pain",
  "cardiac",
  "heart",
  "arrhythmia",
  "palpitation",
  "hypertension",
  "high blood pressure",
  "angina",
  "heart disease",
  "heart condition",
  "valve",
  "heart murmur",
  "atrial fibrillation",
];

const DERMATOLOGY_KEYWORDS = [
  "skin",
  "rash",
  "eczema",
  "psoriasis",
  "acne",
  "mole",
  "wart",
  "fungal",
  "hives",
  "urticaria",
  "dermatitis",
  "pigment",
];

const PEDIATRICS_KEYWORDS = [
  "baby",
  "child",
  "toddler",
  "infant",
  "kid",
  "children",
  "newborn",
  "vaccination",
  "vaccine",
  "immunization",
];

const WOMENS_HEALTH_KEYWORDS = [
  "pregnancy",
  "pregnant",
  "prenatal",
  "postnatal",
  "menstrual",
  "period",
  "menopause",
  "ovarian",
  "breast",
  "cervical",
  "endometriosis",
  "fibroids",
  "pelvic",
];

const ORTHOPEDICS_KEYWORDS = [
  "bone",
  "fracture",
  "joint",
  "spine",
  "arthritis",
  "osteoporosis",
  "torn",
  "injury",
  "muscle",
  "ligament",
  "tendon",
  "sprain",
  "strain",
];

const GASTROENTEROLOGY_KEYWORDS = [
  "stomach",
  "digestive",
  "ibd",
  "crohn",
  "ulcerative colitis",
  "acid reflux",
  "gerd",
  "heartburn",
  "constipation",
  "diarrhea",
  "ibs",
  "irritable bowel",
];

const ENDOCRINOLOGY_KEYWORDS = [
  "thyroid",
  "diabetes",
  "diabetic",
  "tsh",
  "hormone",
  "metabolic",
  "metabolism",
  "glucose",
  "insulin",
  "parathyroid",
  "adrenal",
];

const UROLOGY_KEYWORDS = [
  "kidney",
  "bladder",
  "prostate",
  "urinary",
  "urinate",
  "uti",
  "kidney stone",
  "incontinence",
  "erectile dysfunction",
];

const RADIOLOGY_KEYWORDS = [
  "imaging",
  "x-ray",
  "ct scan",
  "ct",
  "mri",
  "ultrasound",
  "sonogram",
  "radiograph",
  "radiological",
];

const DENTISTRY_KEYWORDS = [
  "teeth",
  "dental",
  "gum",
  "cavity",
  "root canal",
  "tooth pain",
  "toothache",
  "braces",
  "orthodontic",
];

const NUTRITION_KEYWORDS = [
  "nutritionist",
  "nutrition",
  "vitamin",
  "mineral",
  "supplement",
  "calorie",
  "macronutrient",
  "micronutrient",
  "dietary",
];

const IMMUNOLOGY_KEYWORDS = [
  "immune system",
  "allergy",
  "allergic",
  "autoimmune",
  "immunodeficiency",
  "hiv",
  "aids",
  "lupus",
  "rheumatoid",
];

const ENT_KEYWORDS = [
  "ear",
  "nose",
  "throat",
  "sinus",
  "hearing",
  "ear infection",
  "otitis",
  "tuning fork",
  "audiogram",
];

const OPHTHALMOLOGY_KEYWORDS = [
  "eye",
  "vision",
  "contact lens",
  "glasses",
  "retina",
  "glaucoma",
  "cataract",
  "cornea",
  "astigmatism",
  "myopia",
  "hyperopia",
];

const NEPHROLOGY_KEYWORDS = [
  "kidney",
  "renal",
  "dialysis",
  "glomerulonephritis",
  "nephrotic",
  "creatinine",
  "bun",
  "kidney failure",
  "chronic kidney",
];

function matchesAny(query: string, keywords: string[]): boolean {
  const lower = query.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

const KEYWORD_ROUTE_RULES = [
  {
    agent: "mentalHealth",
    reasoning:
      "Keyword match: mental health / psychological support intent detected",
    keywords: MENTAL_HEALTH_KEYWORDS,
  },
  {
    agent: "cardiology",
    reasoning: "Keyword match: cardiac / heart symptoms intent detected",
    keywords: CARDIOLOGY_KEYWORDS,
  },
  {
    agent: "womensHealth",
    reasoning:
      "Keyword match: women's health / pregnancy / reproductive intent detected",
    keywords: WOMENS_HEALTH_KEYWORDS,
  },
  {
    agent: "neurology",
    reasoning: "Keyword match: neurology symptoms intent detected",
    keywords: NEUROLOGY_KEYWORDS,
  },
  {
    agent: "gastroenterology",
    reasoning:
      "Keyword match: gastrointestinal / digestive symptoms intent detected",
    keywords: GASTROENTEROLOGY_KEYWORDS,
  },
  {
    agent: "orthopedics",
    reasoning:
      "Keyword match: bone / joint / orthopedic symptoms intent detected",
    keywords: ORTHOPEDICS_KEYWORDS,
  },
  {
    agent: "dermatology",
    reasoning: "Keyword match: skin condition / dermatology intent detected",
    keywords: DERMATOLOGY_KEYWORDS,
  },
  {
    agent: "endocrinology",
    reasoning:
      "Keyword match: endocrine / thyroid / metabolic disorder intent detected",
    keywords: ENDOCRINOLOGY_KEYWORDS,
  },
  {
    agent: "nephrology",
    reasoning: "Keyword match: kidney / renal condition intent detected",
    keywords: NEPHROLOGY_KEYWORDS,
  },
  {
    agent: "urology",
    reasoning: "Keyword match: urological / urinary symptoms intent detected",
    keywords: UROLOGY_KEYWORDS,
  },
  {
    agent: "ophthalmology",
    reasoning: "Keyword match: eye / vision / ophthalmology intent detected",
    keywords: OPHTHALMOLOGY_KEYWORDS,
  },
  {
    agent: "ent",
    reasoning: "Keyword match: ear / nose / throat symptoms intent detected",
    keywords: ENT_KEYWORDS,
  },
  {
    agent: "immunology",
    reasoning:
      "Keyword match: immune system / allergy / autoimmune condition intent detected",
    keywords: IMMUNOLOGY_KEYWORDS,
  },
  {
    agent: "dentistry",
    reasoning: "Keyword match: dental / tooth symptoms intent detected",
    keywords: DENTISTRY_KEYWORDS,
  },
  {
    agent: "pediatrics",
    reasoning: "Keyword match: pediatric / child / infant care intent detected",
    keywords: PEDIATRICS_KEYWORDS,
  },
  {
    agent: "radiology",
    reasoning:
      "Keyword match: imaging / radiological investigation intent detected",
    keywords: RADIOLOGY_KEYWORDS,
  },
  {
    agent: "nutrition",
    reasoning:
      "Keyword match: nutritional / supplement / dietary intent detected",
    keywords: NUTRITION_KEYWORDS,
  },
  {
    agent: "dietPlanner",
    reasoning: "Keyword match: diet/meal plan intent detected",
    keywords: DIET_KEYWORDS,
  },
  {
    agent: "prescription",
    reasoning: "Keyword match: prescription intent detected",
    keywords: PRESCRIPTION_KEYWORDS,
  },
  {
    agent: "labReport",
    reasoning: "Keyword match: blood test / lab results intent detected",
    keywords: LAB_REPORT_KEYWORDS,
  },
  {
    agent: "patient",
    reasoning: "Keyword match: personal / health data retrieval detected",
    keywords: PATIENT_KEYWORDS,
  },
] as const satisfies ReadonlyArray<{
  agent: AgentType;
  reasoning: string;
  keywords: readonly string[];
}>;

function findKeywordRouteRule(query: string) {
  return KEYWORD_ROUTE_RULES.find((rule) =>
    matchesAny(query, [...rule.keywords]),
  );
}

/**
 * Attempt deterministic keyword routing before calling the LLM.
 * Returns null when the intent is ambiguous and the LLM should decide.
 */
function tryKeywordRoute(
  query: string,
): Omit<ClinicalRouting, "thinkingLevel" | "needsRag" | "loadingHints"> | null {
  const rule = findKeywordRouteRule(query);
  if (!rule) return null;
  return { agent: rule.agent, reasoning: rule.reasoning };
}

// ── Thinking level heuristic ──────────────────────────────────────────────────

const EMERGENCY_KEYWORDS = [
  "chest pain",
  "can't breathe",
  "cannot breathe",
  "bleeding heavily",
  "emergency",
  "suicid",
  "overdose",
  "unconscious",
  "seizure",
];

const REASONING_WORDS = [
  "should",
  "recommend",
  "assess",
  "treat",
  "diagnos",
  "why",
  "cause",
  "explain",
  "analys",
];

type ThinkingLevel = "low" | "medium" | "high";

/**
 * Determine whether the query needs patient medical records (RAG).
 *
 * Centralized in `rag-decision.ts` so gateway and prefetchContext use
 * the same heuristics and avoid drift.
 */
function inferNeedsRag(query: string, hasAttachment?: boolean): boolean {
  return decideRagRequirement(query, hasAttachment).needsRag;
}

/** Classify query complexity to set the model's thinking depth per-message. */
function inferThinkingLevel(
  query: string,
  hasAttachment?: boolean,
): ThinkingLevel {
  if (hasAttachment) return "high";
  const lower = query.toLowerCase();
  if (EMERGENCY_KEYWORDS.some((k) => lower.includes(k))) return "high";
  const hasReasoning = REASONING_WORDS.some((k) => lower.includes(k));
  const words = query.trim().split(/\s+/);
  // Short messages without reasoning intent → low thinking
  // (symptom descriptions like "headache and nausea" don't need deep thinking)
  if (words.length <= 10 && !hasReasoning) return "low";
  if (hasReasoning) return "medium";
  return "medium";
}

// ── Session cache ───────────────────────────────────────────────────────────

/** Hints that should bypass the agent cache (might need diet/prescription/blood test/mental health). */
const DIET_HINT_WORDS = ["diet", "meal", "food", "eat", "nutrition", "calorie"];
const RX_HINT_WORDS = ["prescri", "refill", "medication order"];
const LR_HINT_WORDS = [
  "blood test",
  "lab result",
  "biomarker",
  "blood work",
  "blood panel",
];
const NEURO_HINT_WORDS = [
  "headache",
  "migraine",
  "seizure",
  "numbness",
  "tingling",
  "dizz",
  "vertigo",
  "memory",
  "nerve",
];
const MENTAL_HEALTH_HINT_WORDS = [
  "anxiety",
  "depress",
  "stress",
  "panic",
  "mood",
  "ptsd",
  "OCD",
  "mental",
  "psycholog",
  "therapist",
  "suicid",
  "self-harm",
  "sleep issue",
];
const CARDIOLOGY_HINT_WORDS = [
  "heart",
  "cardiac",
  "chest",
  "arrhythmia",
  "palpitation",
  "hypertension",
  "blood pressure",
  "valve",
];
const DERMATOLOGY_HINT_WORDS = [
  "skin",
  "rash",
  "eczema",
  "psoriasis",
  "acne",
  "mole",
  "wart",
  "fungal",
];
const PEDIATRICS_HINT_WORDS = [
  "baby",
  "child",
  "toddler",
  "infant",
  "kid",
  "vaccination",
  "vaccine",
];
const WOMENS_HEALTH_HINT_WORDS = [
  "pregnancy",
  "pregnant",
  "menstrual",
  "period",
  "menopause",
  "ovarian",
  "breast",
  "cervical",
];
const ORTHOPEDICS_HINT_WORDS = [
  "bone",
  "fracture",
  "joint",
  "spine",
  "arthritis",
  "ligament",
  "tendon",
  "sprain",
];
const GASTRO_HINT_WORDS = [
  "stomach",
  "digestive",
  "ibd",
  "acid reflux",
  "gerd",
  "heartburn",
  "constipat",
  "diarr",
  "ibs",
];
const ENDOCRINOLOGY_HINT_WORDS = [
  "thyroid",
  "diabetes",
  "diabetic",
  "hormone",
  "metabolic",
  "glucose",
  "insulin",
];
const UROLOGY_HINT_WORDS = [
  "kidney",
  "bladder",
  "prostate",
  "urinary",
  "uti",
  "stone",
];
const RADIOLOGY_HINT_WORDS = [
  "imaging",
  "x-ray",
  "ct",
  "mri",
  "ultrasound",
  "sonogram",
];
const DENTISTRY_HINT_WORDS = [
  "teeth",
  "dental",
  "gum",
  "tooth",
  "cavity",
  "root canal",
];
const NUTRITION_HINT_WORDS = [
  "nutrition",
  "vitamin",
  "mineral",
  "supplement",
  "nutrient",
];
const IMMUNOLOGY_HINT_WORDS = [
  "immune",
  "allergy",
  "allergic",
  "autoimmune",
  "immunodeficiency",
];
const ENT_HINT_WORDS = ["ear", "nose", "sinus", "hearing", "throat", "otitis"];
const OPHTHALMOLOGY_HINT_WORDS = [
  "eye",
  "vision",
  "retina",
  "glaucoma",
  "cataract",
  "myopia",
];
const NEPHROLOGY_HINT_WORDS = [
  "kidney",
  "renal",
  "dialysis",
  "creatinine",
  "bun",
];

const RADIOLOGY_ATTACHMENT_HINTS = [
  "x-ray",
  "xray",
  "ct",
  "ct scan",
  "mri",
  "ultrasound",
  "sonogram",
  "mammogram",
  "scan",
  "dicom",
  "radiology",
  "radiograph",
  "imaging",
  "opg",
];

const LAB_ATTACHMENT_HINTS = [
  "lab",
  "blood",
  "report",
  "result",
  "test",
  "panel",
  "biomarker",
  "marker",
  "double marker",
  "triple marker",
  "tumor marker",
  "screening",
  "prenatal",
  "serum",
  "cbc",
  "hba1c",
  "thyroid",
  "lipid",
  "lft",
  "kft",
  "creatinine",
  "troponin",
  "bnp",
  "glucose",
  "insulin",
  "pathology",
];
const PATIENT_HINT_WORDS = [
  "my name",
  "my age",
  "my profile",
  "my weight",
  "my height",
  "my medication",
  "my medicine",
  "who am i",
  "about me",
];

const CLINICAL_CUE_WORDS = [
  "fever",
  "chill",
  "pain",
  "ache",
  "cough",
  "cold",
  "flu",
  "sore",
  "infection",
  "nause",
  "vomit",
  "diarr",
  "constipat",
  "fatigue",
  "tired",
  "weak",
  "swelling",
  "rash",
  "itch",
  "burning",
  "bleed",
  "breath",
  "dizzy",
  "dizziness",
  "headache",
  "migraine",
  "sleep",
  "urine",
  "pee",
  "tooth",
  "gum",
  "vision",
  "eye",
  "ear",
  "throat",
  "sinus",
  "stomach",
  "abdomen",
  "back pain",
  "period",
  "pregnan",
  "symptom",
  "sick",
];

const TRIAGE_FALLBACK_EXACT = new Set([
  "hi",
  "hello",
  "hey",
  "good morning",
  "good afternoon",
  "good evening",
  "help",
  "can you help me",
  "i need help",
  "not sure",
  "i'm not sure",
  "i dont know",
  "i don't know",
  "idk",
]);

function hintsSpecialist(query: string): boolean {
  const lower = query.toLowerCase();
  return (
    DIET_HINT_WORDS.some((k) => lower.includes(k)) ||
    RX_HINT_WORDS.some((k) => lower.includes(k)) ||
    LR_HINT_WORDS.some((k) => lower.includes(k)) ||
    NEURO_HINT_WORDS.some((k) => lower.includes(k)) ||
    MENTAL_HEALTH_HINT_WORDS.some((k) => lower.includes(k)) ||
    CARDIOLOGY_HINT_WORDS.some((k) => lower.includes(k)) ||
    DERMATOLOGY_HINT_WORDS.some((k) => lower.includes(k)) ||
    PEDIATRICS_HINT_WORDS.some((k) => lower.includes(k)) ||
    WOMENS_HEALTH_HINT_WORDS.some((k) => lower.includes(k)) ||
    ORTHOPEDICS_HINT_WORDS.some((k) => lower.includes(k)) ||
    GASTRO_HINT_WORDS.some((k) => lower.includes(k)) ||
    ENDOCRINOLOGY_HINT_WORDS.some((k) => lower.includes(k)) ||
    UROLOGY_HINT_WORDS.some((k) => lower.includes(k)) ||
    RADIOLOGY_HINT_WORDS.some((k) => lower.includes(k)) ||
    DENTISTRY_HINT_WORDS.some((k) => lower.includes(k)) ||
    NUTRITION_HINT_WORDS.some((k) => lower.includes(k)) ||
    IMMUNOLOGY_HINT_WORDS.some((k) => lower.includes(k)) ||
    ENT_HINT_WORDS.some((k) => lower.includes(k)) ||
    OPHTHALMOLOGY_HINT_WORDS.some((k) => lower.includes(k)) ||
    NEPHROLOGY_HINT_WORDS.some((k) => lower.includes(k)) ||
    PATIENT_HINT_WORDS.some((k) => lower.includes(k))
  );
}

function looksClinical(query: string): boolean {
  const lower = query.toLowerCase();
  return CLINICAL_CUE_WORDS.some((k) => lower.includes(k));
}

function shouldUseTriageFallback(query: string): boolean {
  const lower = query.trim().toLowerCase();
  if (lower.length === 0) return true;
  if (TRIAGE_FALLBACK_EXACT.has(lower)) return true;

  const words = lower.split(/\s+/);
  if (words.length <= 2 && !looksClinical(lower) && !hintsSpecialist(lower)) {
    return true;
  }

  return false;
}

function shouldBypassSessionCache(query: string): boolean {
  return hintsSpecialist(query);
}

function canReuseCachedAgent(agent: AgentType | undefined): agent is AgentType {
  return agent !== undefined && agent !== "triageNurse";
}

function getDefaultAgent(query: string): AgentType {
  return shouldUseTriageFallback(query) ? "triageNurse" : "generalMedicine";
}

function buildRoutingLogPrefix(input: {
  userId: string;
  userQuery: string;
}): string {
  const preview = `${input.userQuery.slice(0, 100)}${input.userQuery.length > 100 ? "…" : ""}`;
  return `[GatewayAgent] Routing for user ${input.userId}: "${preview}"`;
}

function logGatewayDecision(
  source: string,
  agent: AgentType,
  thinkingLevel: ThinkingLevel,
  needsRag: boolean,
  duration: number,
): void {
  console.log(
    `[GatewayAgent] → ${agent} (${source}, thinking: ${thinkingLevel}, rag: ${needsRag}, ${duration.toFixed(0)}ms)`,
  );
}

function buildRoutingResult(
  agent: AgentType,
  reasoning: string,
  thinkingLevel: ThinkingLevel,
  needsRag: boolean,
): ClinicalRouting {
  return {
    agent,
    reasoning,
    thinkingLevel,
    needsRag,
    loadingHints: [],
  };
}

function getAttachmentReportReasoning(args: {
  hasExtractedReportSummary: boolean;
  hasLabLabel: boolean;
}): string {
  if (args.hasExtractedReportSummary) {
    return "Extracted report summary detected — routing to the most relevant specialist for analysis";
  }

  if (args.hasLabLabel) {
    return "Classified report attachment detected — routing to the most relevant specialist for analysis";
  }

  return "Report-style attachment detected — routing to the most relevant specialist for analysis";
}

// ── Routing schema ────────────────────────────────────────────────────────────

/**
 * The three clinical agent types the gateway can route to.
 * (onboarding variants are handled deterministically before the gateway runs.)
 */
export const AgentType = z.enum([
  "triageNurse", // Nurse triage for ambiguous/undecided queries
  "generalMedicine", // Primary care / internal medicine fallback
  "neurology", // Neurology-specific symptoms (headache, seizure, etc.)
  "cardiology",
  "mentalHealth",
  "dermatology",
  "pediatrics",
  "womensHealth",
  "orthopedics",
  "gastroenterology",
  "endocrinology",
  "urology",
  "radiology",
  "dentistry",
  "nutrition",
  "immunology",
  "ent",
  "ophthalmology",
  "nephrology",
  "dietPlanner", // 7-day meal plan generation
  "prescription", // Prescription generation and medication management
  "labReport", // Lab report interpretation and analysis
  "patient", // Patient data retrieval (profile, health metrics, medications)
]);
export type AgentType = z.infer<typeof AgentType>;

export type ClinicalRouting = {
  agent: AgentType;
  reasoning: string;
  thinkingLevel: "low" | "medium" | "high";
  /** Whether the query likely needs patient medical records (RAG). false skips
   *  the expensive KNN + Bedrock reranking pipeline (~1.2-1.5s). */
  needsRag: boolean;
  /** Contextual loading phrases for the client to cycle through while waiting. */
  loadingHints: string[];
};

type GatewayDecisionInput = {
  userQuery: string;
  hasAttachment?: boolean;
  attachmentMetadata?: Array<{
    fileId?: string;
    url: string;
    mediaType: string;
    fileName?: string;
    label?: FileLabel;
    extractedSummary?: {
      testName?: string;
      labName?: string;
      notes?: string;
      biomarkerNames: string[];
    };
  }>;
  reportHandoff?: {
    nextSpecialist: string;
    autoRoute?: boolean;
    reason?: string;
    reportLabel?: string;
  };
  recentMessages?: string[];
  userId: string;
  sessionId?: string;
  lastAgentType?: string;
};

type DecisionContext = {
  input: GatewayDecisionInput;
  startTime: number;
  thinkingLevel: ThinkingLevel;
  needsRag: boolean;
};

// ── Gateway Agent ─────────────────────────────────────────────────────────────

export class GatewayAgent {
  private readonly sessionCache = new Map<string, AgentType>();
  private static readonly MAX_CACHE = 500;

  /**
   * Decide which clinical agent should handle this request.
   *
   * Priority: keyword match → session cache → LLM (Flash Lite).
   * thinkingLevel is always determined by heuristic (per-message complexity).
   */
  async decide(input: GatewayDecisionInput): Promise<ClinicalRouting> {
    const context = this.buildDecisionContext(input);
    console.log(buildRoutingLogPrefix(input));

    // Check for attachment classification first — medical images and lab reports
    // need intelligent routing based on content analysis
    if (input.hasAttachment) {
      const attachmentRoute = await this.resolveAttachmentRoute(context);
      if (attachmentRoute) return attachmentRoute;
    }

    const reportHandoffRoute = this.resolveReportHandoff(context);
    if (reportHandoffRoute) return reportHandoffRoute;

    return (
      this.resolveKeywordRoute(context) ??
      this.resolveCachedRoute(context) ??
      this.resolveDefaultRoute(context) ??
      this.resolveLlmRoute(context)
    );
  }

  private buildDecisionContext(input: GatewayDecisionInput): DecisionContext {
    return {
      input,
      startTime: performance.now(),
      thinkingLevel: inferThinkingLevel(input.userQuery, input.hasAttachment),
      needsRag: inferNeedsRag(input.userQuery, input.hasAttachment),
    };
  }

  /**
   * Classify attachments and route intelligently.
   * - Imaging-related attachments → radiology
   * - Lab/report-style attachments → specialist inferred from results type
   * - Other → pass through to normal routing
   */
  private async resolveAttachmentRoute(
    context: DecisionContext,
  ): Promise<ClinicalRouting | null> {
    const { attachmentMetadata, userQuery } = context.input;

    // If attachment but no metadata, can't classify — return null to continue normal routing
    if (!attachmentMetadata || attachmentMetadata.length === 0) return null;

    const attachmentNames = attachmentMetadata
      .map((a) => a.fileName?.toLowerCase() ?? "")
      .filter((value) => value.length > 0)
      .join(" ");
    const attachmentSummaries = attachmentMetadata
      .flatMap((attachment) => {
        const summary = attachment.extractedSummary;
        if (!summary) {
          return [];
        }

        return [
          summary.testName,
          summary.labName,
          summary.notes,
          ...(summary.biomarkerNames ?? []),
        ];
      })
      .filter((value): value is string =>
        Boolean(value && value.trim().length > 0),
      )
      .join(" ");
    const attachmentLabels = attachmentMetadata
      .map((a) => a.label)
      .filter((value): value is FileLabel => Boolean(value));
    const attachmentText = `${userQuery.toLowerCase()} ${attachmentNames} ${attachmentSummaries.toLowerCase()}`;

    const hasAnyHint = (hints: readonly string[]) =>
      hints.some((hint) => attachmentText.includes(hint));

    const looksLikeLabAttachment = hasAnyHint(LAB_ATTACHMENT_HINTS);
    const looksLikeRadiologyAttachment =
      hasAnyHint(RADIOLOGY_ATTACHMENT_HINTS) && !looksLikeLabAttachment;
    const hasLabLabel = attachmentLabels.some(
      (label) => label === "blood_test" || label === "report",
    );
    const hasExtractedReportSummary = attachmentMetadata.some((attachment) => {
      const summary = attachment.extractedSummary;
      return Boolean(
        summary?.testName ||
        summary?.notes ||
        summary?.labName ||
        (summary?.biomarkerNames?.length ?? 0) > 0,
      );
    });
    const hasRadiologyLabel = attachmentLabels.some(
      (label) => label === "xray" || label === "scan",
    );

    // Check MIME types for quick classification
    const isImageAttachment = attachmentMetadata.some((a) =>
      a.mediaType.startsWith("image/"),
    );
    const isPdfAttachment = attachmentMetadata.some(
      (a) => a.mediaType === "application/pdf",
    );

    if (hasLabLabel || looksLikeLabAttachment || hasExtractedReportSummary) {
      const specialist = await this.inferLabReportSpecialist(
        attachmentText,
        context.input.userId,
      );
      const reasoning = getAttachmentReportReasoning({
        hasExtractedReportSummary,
        hasLabLabel,
      });
      this.cacheResolvedAgent(context.input.sessionId, specialist);
      return this.finishDecision(
        context,
        specialist,
        reasoning,
        true,
        "attachment-report",
      );
    }

    if (
      hasRadiologyLabel ||
      (isImageAttachment && looksLikeRadiologyAttachment)
    ) {
      // Only imaging-related images should route straight to radiology.
      const reasoning = hasRadiologyLabel
        ? "Classified imaging attachment detected — routing to radiology for diagnostic analysis"
        : "Imaging-related attachment detected — routing to radiology for diagnostic analysis";
      this.cacheResolvedAgent(context.input.sessionId, "radiology");
      return this.finishDecision(
        context,
        "radiology",
        reasoning,
        false,
        "attachment-image",
      );
    }

    if (isPdfAttachment && looksLikeRadiologyAttachment) {
      const reasoning =
        "Radiology report attachment detected — routing to radiology for imaging analysis";
      this.cacheResolvedAgent(context.input.sessionId, "radiology");
      return this.finishDecision(
        context,
        "radiology",
        reasoning,
        true,
        "attachment-radiology-report",
      );
    }

    // Couldn't classify — fall through to normal routing
    return null;
  }

  private resolveReportHandoff(
    context: DecisionContext,
  ): ClinicalRouting | null {
    const handoff = context.input.reportHandoff;
    if (!handoff) {
      console.log("[GatewayAgent] No report handoff found in input");
      return null;
    }
    if (handoff.autoRoute === false) {
      console.log("[GatewayAgent] Report handoff has autoRoute=false");
      return null;
    }

    const parsedAgent = AgentType.safeParse(handoff.nextSpecialist);
    if (!parsedAgent.success) {
      console.log(
        `[GatewayAgent] Invalid specialist: ${handoff.nextSpecialist}`,
        parsedAgent.error,
      );
      return null;
    }

    const reasonSuffix = handoff.reason ? ` (${handoff.reason})` : "";
    const labelPrefix =
      handoff.reportLabel && handoff.reportLabel.trim().length > 0
        ? `${handoff.reportLabel.trim()} handoff`
        : "Report handoff";
    const reasoning = `${labelPrefix} auto-route to ${parsedAgent.data}${reasonSuffix}`;

    console.log(
      `[GatewayAgent] Routing via report handoff to ${parsedAgent.data}`,
    );

    this.cacheResolvedAgent(context.input.sessionId, parsedAgent.data);
    return this.finishDecision(
      context,
      parsedAgent.data,
      reasoning,
      context.needsRag,
      "report-handoff",
    );
  }

  /**
   * Infer which specialist should analyze the lab report based on query.
   * Uses keyword hints to determine the most likely specialty.
   */
  private async inferLabReportSpecialist(
    query: string,
    _userId: string,
  ): Promise<AgentType> {
    const lower = query.toLowerCase();

    // Quick keyword matches for common lab types
    if (
      lower.includes("troponin") ||
      lower.includes("bnp") ||
      lower.includes("ecg") ||
      lower.includes("cardiac")
    ) {
      return "cardiology";
    }
    if (
      lower.includes("glucose") ||
      lower.includes("hba1c") ||
      lower.includes("insulin") ||
      lower.includes("thyroid") ||
      lower.includes("tsh")
    ) {
      return "endocrinology";
    }
    if (
      lower.includes("double marker") ||
      lower.includes("triple marker") ||
      lower.includes("prenatal screening") ||
      lower.includes("maternal serum") ||
      lower.includes("alpha fetoprotein") ||
      lower.includes("afp") ||
      lower.includes("beta hcg") ||
      lower.includes("free beta hcg") ||
      lower.includes("papp-a")
    ) {
      return "womensHealth";
    }
    if (
      lower.includes("hemoglobin") ||
      lower.includes("wbc") ||
      lower.includes("platelet") ||
      lower.includes("cbc")
    ) {
      return "generalMedicine"; // or hematology-specialized agent if available
    }
    if (
      lower.includes("kidney") ||
      lower.includes("creatinine") ||
      lower.includes("bun")
    ) {
      return "nephrology";
    }
    if (
      lower.includes("liver") ||
      lower.includes("ast") ||
      lower.includes("alt") ||
      lower.includes("bilirubin")
    ) {
      return "generalMedicine"; // or gastroenterology
    }

    // Fall back to labReport agent for generic analysis
    return "labReport";
  }

  private resolveKeywordRoute(
    context: DecisionContext,
  ): ClinicalRouting | null {
    const keywordResult = tryKeywordRoute(context.input.userQuery);
    if (!keywordResult) return null;

    const effectiveRag =
      keywordResult.agent === "patient" ? false : context.needsRag;
    this.cacheResolvedAgent(context.input.sessionId, keywordResult.agent);
    return this.finishDecision(
      context,
      keywordResult.agent,
      keywordResult.reasoning,
      effectiveRag,
      "keyword",
    );
  }

  private resolveCachedRoute(context: DecisionContext): ClinicalRouting | null {
    if (!context.input.sessionId) return null;
    if (shouldBypassSessionCache(context.input.userQuery)) return null;

    const cached = this.getCachedAgent(
      context.input.sessionId,
      context.input.lastAgentType,
    );
    if (!canReuseCachedAgent(cached)) return null;

    this.cacheResolvedAgent(context.input.sessionId, cached);
    return this.finishDecision(
      context,
      cached,
      "Session cache hit",
      context.needsRag,
      "cached",
    );
  }

  private resolveDefaultRoute(
    context: DecisionContext,
  ): ClinicalRouting | null {
    if (hintsSpecialist(context.input.userQuery)) return null;

    const agent = getDefaultAgent(context.input.userQuery);
    const reasoning =
      agent === "generalMedicine"
        ? "Default: non-specialist clinical query routed to general medicine"
        : "Fallback: insufficient signal to choose a specialist safely";

    this.cacheResolvedAgent(context.input.sessionId, agent);
    return this.finishDecision(
      context,
      agent,
      reasoning,
      context.needsRag,
      "default",
    );
  }

  private async resolveLlmRoute(
    context: DecisionContext,
  ): Promise<ClinicalRouting> {
    const agent = await aiService.extractChoice(
      AgentType.options,
      [
        { role: "system", content: buildRoutingPrompt(context.input) },
        { role: "user", content: context.input.userQuery },
      ],
      { userId: context.input.userId, useLite: true, skipCredit: true },
    );

    this.cacheResolvedAgent(context.input.sessionId, agent);
    return this.finishDecision(
      context,
      agent,
      "LLM classification",
      context.needsRag,
      "LLM choice",
    );
  }

  private finishDecision(
    context: DecisionContext,
    agent: AgentType,
    reasoning: string,
    needsRag: boolean,
    source: string,
  ): ClinicalRouting {
    const duration = performance.now() - context.startTime;
    logGatewayDecision(
      source,
      agent,
      context.thinkingLevel,
      needsRag,
      duration,
    );
    return buildRoutingResult(
      agent,
      reasoning,
      context.thinkingLevel,
      needsRag,
    );
  }

  private getCachedAgent(
    sessionId: string,
    lastAgentType?: string,
  ): AgentType | undefined {
    const cached =
      this.sessionCache.get(sessionId) ??
      (lastAgentType as AgentType | undefined);
    return AgentType.safeParse(cached).success ? cached : undefined;
  }

  private cacheResolvedAgent(
    sessionId: string | undefined,
    agent: AgentType,
  ): void {
    if (!sessionId) return;
    this.cacheAgent(sessionId, agent);
  }

  private cacheAgent(sessionId: string, agent: AgentType): void {
    if (agent === "triageNurse") return;
    if (this.sessionCache.size >= GatewayAgent.MAX_CACHE) {
      const keys = [...this.sessionCache.keys()];
      for (let i = 0; i < keys.length / 2; i++) {
        this.sessionCache.delete(keys[i]);
      }
    }
    this.sessionCache.set(sessionId, agent);
  }
}

/** Singleton — import this throughout the server-side application. */
export const gatewayAgent = new GatewayAgent();
