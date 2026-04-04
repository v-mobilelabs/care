/**
 * LLM-based RAG classifier
 *
 * Determines whether a user query requires retrieving the patient's stored
 * medical records (medications, diagnoses, labs, allergies, vitals, etc.)
 * before the agent can answer.
 *
 * Why LLM instead of keywords:
 *  - Keyword heuristics like "should" / "recommend" trigger false positives for
 *    generic session-opener phrases ("I want to check my symptoms").
 *  - Semantic classification handles all edge-cases gracefully without needing
 *    a maintained phrase blocklist.
 *
 * Model: Lite (gemini-3.1-flash-lite-preview) — ~50ms, no credit consumed.
 * Fallback: keyword heuristic from rag-decision.ts when LLM call fails.
 */

import { aiService } from "@/data/shared/service/ai.service";
import { decideRagRequirement } from "./rag-decision";

// ── Prompt ────────────────────────────────────────────────────────────────────

const RAG_CLASSIFIER_PROMPT = `You are a triage classifier for a medical AI assistant.

Decide whether answering the user's message requires looking up their EXISTING stored medical records (medications they are currently taking, past diagnoses, lab results on file, allergy records, vital history, prescriptions).

Reply "needs_rag" ONLY when the message:
- References something the user is already taking or has been diagnosed with ("my medication", "my condition", "my blood test results")
- Asks about stored personal health data ("what are my allergies", "show me my prescriptions")
- Needs patient history to give a safe clinical recommendation ("given my current meds, should I...")

Reply "no_rag" when the message:
- Is a new symptom presentation or health check opener ("I have a headache", "I want to check my symptoms", "I'm not feeling well")
- Is a general medical question with no reference to stored personal data
- Is a greeting, small-talk, or session opener
- Is asking to start an assessment or health check
- Is about a topic where the agent will ask follow-up questions to gather info

When in doubt, prefer "no_rag". The agent can always fetch records later via tools if needed.`;

// ── Classifier ────────────────────────────────────────────────────────────────

const RAG_OPTIONS = ["needs_rag", "no_rag"] as const;
type RagClassification = (typeof RAG_OPTIONS)[number];

/**
 * LLM-based RAG gate — uses the lite model for fast classification (~50ms).
 * Does NOT consume a user credit (skipCredit: true).
 *
 * Falls back to the keyword heuristic from `rag-decision.ts` if the LLM
 * call fails for any reason (network, quota, model error).
 *
 * @param query   The user's raw message text.
 * @param userId  Used for model access only (no credit deducted).
 * @returns       `{ needsRag, reason }` — reason is "llm-classified" or "llm-fallback".
 */
export async function classifyRagNeedLLM(
  query: string,
  userId: string,
): Promise<{ needsRag: boolean; reason: "llm-classified" | "llm-fallback" }> {
  try {
    const classification = await aiService.extractChoice<RagClassification>(
      RAG_OPTIONS,
      [
        { role: "system", content: RAG_CLASSIFIER_PROMPT },
        { role: "user", content: [{ type: "text", text: query }] },
      ],
      { userId, useLite: true, skipCredit: true },
    );

    const needsRag = classification === "needs_rag";
    console.log(
      `[RagClassifier] query="${query.slice(0, 80)}" → ${classification}`,
    );
    return { needsRag, reason: "llm-classified" };
  } catch (err) {
    // Graceful degradation: keyword heuristic if LLM unavailable
    console.warn(
      "[RagClassifier] LLM classification failed, using fallback:",
      err,
    );
    const fallback = decideRagRequirement(query, false);
    return { needsRag: fallback.needsRag, reason: "llm-fallback" };
  }
}
