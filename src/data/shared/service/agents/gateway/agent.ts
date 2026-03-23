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

import { z } from "zod";
import { aiService } from "@/data/shared/service/ai.service";
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
  "biomarker",
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

function matchesAny(query: string, keywords: string[]): boolean {
  const lower = query.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

const KEYWORD_ROUTE_RULES = [
  {
    agent: "neurology",
    reasoning: "Keyword match: neurology symptoms intent detected",
    keywords: NEUROLOGY_KEYWORDS,
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

const RECORD_HINTS = [
  "my medication",
  "my medicine",
  "my med",
  "my prescription",
  "my condition",
  "my blood",
  "my lab",
  "my result",
  "my report",
  "my vital",
  "my diagnos",
  "my treatment",
  "my history",
  "my record",
  "my allerg",
  "interaction",
  "my health",
  "my drug",
  "my dose",
  "my dosage",
  "my name",
  "my age",
  "my profile",
  "my weight",
  "my height",
  "my gender",
  "my detail",
  "my info",
  "my data",
  "who am i",
  "about me",
  "medicines i",
  "medications i",
  "meds i",
  "drugs i",
  "been taking",
  "i take",
  "i'm taking",
  "am taking",
  "prescribed",
];

function hasRecordHint(query: string): boolean {
  return RECORD_HINTS.some((hint) => query.includes(hint));
}

function isShortTriageOpener(query: string): boolean {
  return query.trim().split(/\s+/).length <= 12;
}

/**
 * Determine whether the query needs patient medical records (RAG).
 *
 * RAG is expensive (~1.2-1.5s for KNN + Bedrock reranking). Skip it for:
 * - Initial symptom triage ("I have a headache") — model will ask follow-ups first
 * - Greetings and simple questions ("hi", "what can you do")
 * - Diet/prescription keyword matches — those agents fetch their own data
 *
 * RAG IS needed for:
 * - File uploads (model needs patient history for context)
 * - Explicit record references ("my medications", "my blood pressure")
 * - Complex reasoning queries that reference patient data
 */
function inferNeedsRag(query: string, hasAttachment?: boolean): boolean {
  if (hasAttachment) return true;

  const lower = query.toLowerCase();
  if (hasRecordHint(lower)) return true;
  if (REASONING_WORDS.some((k) => lower.includes(k))) return true;
  return !isShortTriageOpener(query);
}

/** Classify query complexity to set the model's thinking depth per-message. */
function inferThinkingLevel(
  query: string,
  hasAttachment?: boolean,
): "low" | "medium" | "high" {
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

/** Hints that should bypass the agent cache (might need diet/prescription/blood test). */
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
  "anxiety",
  "depress",
  "stress",
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

const TRIAGE_FALLBACK_EXACT = [
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
];

const LOADING_HINTS_BY_AGENT: Partial<Record<AgentType, string[]>> = {
  generalMedicine: [
    "Reviewing your symptoms...",
    "Checking likely causes and next steps...",
    "Preparing safe guidance...",
  ],
  neurology: [
    "Reviewing neurological symptoms...",
    "Assessing headache and nerve-related patterns...",
    "Preparing neurology-focused guidance...",
  ],
  dietPlanner: [
    "Creating your personalized meal plan...",
    "Calculating nutritional requirements...",
    "This may take 15-20 seconds",
  ],
  prescription: [
    "Reviewing medication options...",
    "Checking drug interactions...",
    "Preparing your prescription...",
  ],
  labReport: [
    "Analysing your test results...",
    "Checking reference ranges...",
    "Reviewing the details...",
  ],
  patient: ["Looking up your records..."],
  triageNurse: [
    "A nurse is reviewing your symptoms...",
    "Asking clarifying questions...",
    "Routing to the right specialist...",
  ],
};

function hintsSpecialist(query: string): boolean {
  const lower = query.toLowerCase();
  return (
    DIET_HINT_WORDS.some((k) => lower.includes(k)) ||
    RX_HINT_WORDS.some((k) => lower.includes(k)) ||
    LR_HINT_WORDS.some((k) => lower.includes(k)) ||
    NEURO_HINT_WORDS.some((k) => lower.includes(k)) ||
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
  if (TRIAGE_FALLBACK_EXACT.includes(lower)) return true;

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
  thinkingLevel: "low" | "medium" | "high",
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
  thinkingLevel: "low" | "medium" | "high",
  needsRag: boolean,
): ClinicalRouting {
  return {
    agent,
    reasoning,
    thinkingLevel,
    needsRag,
    loadingHints: buildLoadingHints(agent, thinkingLevel, needsRag),
  };
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

// ── Loading hints ─────────────────────────────────────────────────────────────

/**
 * Build contextual loading phrases based on the full routing decision.
 * These are shown in the client as cycling status messages while the AI responds.
 */
function buildLoadingHints(
  agent: AgentType,
  thinkingLevel: "low" | "medium" | "high",
  needsRag: boolean,
): string[] {
  const hints: string[] = [];
  if (needsRag) hints.push("Searching your health records...");
  hints.push(...(LOADING_HINTS_BY_AGENT[agent] ?? []));
  return hints.length > 0 ? hints : ["Processing your request..."];
}

type GatewayDecisionInput = {
  userQuery: string;
  hasAttachment?: boolean;
  recentMessages?: string[];
  userId: string;
  sessionId?: string;
  lastAgentType?: string;
};

type DecisionContext = {
  input: GatewayDecisionInput;
  startTime: number;
  thinkingLevel: "low" | "medium" | "high";
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
