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

const BLOOD_TEST_KEYWORDS = [
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

function matchesAny(query: string, keywords: string[]): boolean {
  const lower = query.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

/**
 * Attempt deterministic keyword routing before calling the LLM.
 * Returns null when the intent is ambiguous and the LLM should decide.
 */
function tryKeywordRoute(
  query: string,
): Omit<ClinicalRouting, "thinkingLevel" | "needsRag" | "loadingHints"> | null {
  if (matchesAny(query, DIET_KEYWORDS)) {
    return {
      agent: "dietPlanner",
      reasoning: "Keyword match: diet/meal plan intent detected",
    };
  }
  if (matchesAny(query, PRESCRIPTION_KEYWORDS)) {
    return {
      agent: "prescription",
      reasoning: "Keyword match: prescription intent detected",
    };
  }
  if (matchesAny(query, BLOOD_TEST_KEYWORDS)) {
    return {
      agent: "bloodTest",
      reasoning: "Keyword match: blood test / lab results intent detected",
    };
  }
  if (matchesAny(query, PATIENT_KEYWORDS)) {
    return {
      agent: "patient",
      reasoning: "Keyword match: personal / health data retrieval detected",
    };
  }
  return null;
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

const SIMPLE_RECALL_WORDS = [
  "what",
  "which",
  "when",
  "list",
  "show",
  "tell",
  "my",
  "am i",
  "do i",
  "how much",
  "how many",
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
  // File uploads always need patient context
  if (hasAttachment) return true;

  const lower = query.toLowerCase();

  // Explicit references to patient records
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
    // Phrasing without "my" — queries like "what medicines have I been taking"
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
  if (RECORD_HINTS.some((k) => lower.includes(k))) return true;

  // Reasoning queries that benefit from patient context
  if (REASONING_WORDS.some((k) => lower.includes(k))) return true;

  // Short messages are typically triage openers — no RAG needed
  const words = query.trim().split(/\s+/);
  if (words.length <= 12) return false;

  // Default: longer or ambiguous queries get RAG
  return true;
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
const BT_HINT_WORDS = [
  "blood test",
  "lab result",
  "biomarker",
  "blood work",
  "blood panel",
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

function hintsSpecialist(query: string): boolean {
  const lower = query.toLowerCase();
  return (
    DIET_HINT_WORDS.some((k) => lower.includes(k)) ||
    RX_HINT_WORDS.some((k) => lower.includes(k)) ||
    BT_HINT_WORDS.some((k) => lower.includes(k)) ||
    PATIENT_HINT_WORDS.some((k) => lower.includes(k))
  );
}

// ── Routing schema ────────────────────────────────────────────────────────────

/**
 * The three clinical agent types the gateway can route to.
 * (onboarding variants are handled deterministically before the gateway runs.)
 */
export const AgentType = z.enum([
  "clinical", // General medical reasoning and assessment
  "dietPlanner", // 7-day meal plan generation
  "prescription", // Prescription generation and medication management
  "bloodTest", // Blood test interpretation and analysis
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

  switch (agent) {
    case "dietPlanner":
      hints.push(
        "Creating your personalized meal plan...",
        "Calculating nutritional requirements...",
        "This may take 15-20 seconds",
      );
      break;
    case "prescription":
      hints.push(
        "Reviewing medication options...",
        "Checking drug interactions...",
        "Preparing your prescription...",
      );
      break;
    case "bloodTest":
      hints.push(
        "Analysing your test results...",
        "Checking reference ranges...",
        "Reviewing the details...",
      );
      break;
    case "patient":
      hints.push("Looking up your records...");
      break;
    case "clinical":
      if (thinkingLevel === "high") {
        hints.push(
          "Taking a careful look at this...",
          "Reviewing clinical guidelines...",
          "Putting this together...",
        );
      } else if (thinkingLevel === "medium") {
        hints.push(
          "Analysing your symptoms...",
          "Checking clinical guidelines...",
          "Reviewing the details...",
        );
      } else {
        hints.push("Let me think about that...", "One moment...");
      }
      break;
  }

  return hints.length > 0 ? hints : ["Processing your request..."];
}

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
  async decide(input: {
    userQuery: string;
    hasAttachment?: boolean;
    recentMessages?: string[];
    userId: string;
    sessionId?: string;
  }): Promise<ClinicalRouting> {
    const startTime = performance.now();
    const thinkingLevel = inferThinkingLevel(
      input.userQuery,
      input.hasAttachment,
    );
    const needsRag = inferNeedsRag(input.userQuery, input.hasAttachment);

    console.log(
      `[GatewayAgent] Routing for user ${input.userId}: "${input.userQuery.slice(0, 100)}${input.userQuery.length > 100 ? "…" : ""}"`,
    );

    // ── 1. Keyword match (0ms, no LLM) ──────────────────────────────────────
    const keywordResult = tryKeywordRoute(input.userQuery);
    if (keywordResult) {
      if (input.sessionId)
        this.cacheAgent(input.sessionId, keywordResult.agent);
      const duration = performance.now() - startTime;
      // Patient agent uses direct Firestore reads — skip RAG entirely
      const effectiveRag = keywordResult.agent === "patient" ? false : needsRag;
      console.log(
        `[GatewayAgent] → ${keywordResult.agent} (keyword, thinking: ${thinkingLevel}, rag: ${effectiveRag}, ${duration.toFixed(0)}ms)`,
      );
      return {
        ...keywordResult,
        reasoning: keywordResult.reasoning,
        thinkingLevel,
        needsRag: effectiveRag,
        loadingHints: buildLoadingHints(
          keywordResult.agent,
          thinkingLevel,
          effectiveRag,
        ),
      };
    }

    // ── 2. Session cache (skip if query hints at specialist) ────────
    if (input.sessionId && !hintsSpecialist(input.userQuery)) {
      const cached = this.sessionCache.get(input.sessionId);
      if (cached) {
        const duration = performance.now() - startTime;
        console.log(
          `[GatewayAgent] → ${cached} (cached, thinking: ${thinkingLevel}, rag: ${needsRag}, ${duration.toFixed(0)}ms)`,
        );
        return {
          agent: cached,
          reasoning: "Session cache hit",
          thinkingLevel,
          needsRag,
          loadingHints: buildLoadingHints(cached, thinkingLevel, needsRag),
        };
      }
    }

    // ── 3. Default-to-clinical (0ms) when no specialist signals ─────────
    // Most queries route to clinical. Only invoke the LLM when the query
    // contains specialist hints that keyword matching didn't resolve.
    if (!hintsSpecialist(input.userQuery)) {
      if (input.sessionId) this.cacheAgent(input.sessionId, "clinical");
      const duration = performance.now() - startTime;
      console.log(
        `[GatewayAgent] → clinical (default, thinking: ${thinkingLevel}, rag: ${needsRag}, ${duration.toFixed(0)}ms)`,
      );
      return {
        agent: "clinical",
        reasoning: "Default: no specialist signals detected",
        thinkingLevel,
        needsRag,
        loadingHints: buildLoadingHints("clinical", thinkingLevel, needsRag),
      };
    }

    // ── 4. LLM routing (Flash Lite, no credit) — only for ambiguous specialist queries
    const agent = await aiService.extractChoice(
      AgentType.options,
      [
        {
          role: "system",
          content: buildRoutingPrompt(input),
        },
        {
          role: "user",
          content: input.userQuery,
        },
      ],
      {
        userId: input.userId,
        useLite: true,
        skipCredit: true,
      },
    );

    if (input.sessionId) this.cacheAgent(input.sessionId, agent);

    const duration = performance.now() - startTime;
    console.log(
      `[GatewayAgent] → ${agent} (LLM choice, thinking: ${thinkingLevel}, rag: ${needsRag}, ${duration.toFixed(0)}ms)`,
    );

    return {
      agent,
      reasoning: "LLM classification",
      thinkingLevel,
      needsRag,
      loadingHints: buildLoadingHints(agent, thinkingLevel, needsRag),
    };
  }

  private cacheAgent(sessionId: string, agent: AgentType): void {
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
