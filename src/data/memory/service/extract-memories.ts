/**
 * Auto-extract memorable facts from a conversation turn.
 *
 * Uses a fast model to identify patient-specific facts worth saving
 * to long-term memory. Designed to run in the `after()` block so
 * it doesn't affect response latency — similar to Mem0's transparent
 * `addMemories(messages)` pattern.
 */

import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { memoryRepository } from "../repositories/memory.repository";
import type { MemoryCategory } from "../models/memory.model";
import { CacheTags } from "@/data/cached";

// ── Schema ────────────────────────────────────────────────────────────────────

const CATEGORIES = ["medical", "allergy", "preference", "lifestyle"] as const;

const extractionSchema = z.object({
  facts: z
    .array(
      z.object({
        category: z.enum(CATEGORIES),
        content: z.string().describe("Concise one-sentence patient fact"),
      }),
    )
    .max(10)
    .describe("Up to 10 new facts extracted from this conversation turn"),
});

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(
  existing: string,
  userMessage: string,
  assistantMessage: string,
): string {
  // Truncate to keep the prompt focused on the current turn and avoid
  // generating too many facts that exhaust the output token budget.
  const PATIENT_LIMIT = 500;
  const ASSISTANT_LIMIT = 1500;
  const truncated = (s: string, limit: number) =>
    s.length > limit ? s.slice(0, limit) + "…" : s;

  return [
    "Extract important patient-specific facts from this medical conversation that should be remembered for future sessions.",
    "",
    "RULES:",
    "- Only extract STABLE facts about THIS patient (not generic medical advice)",
    "- Extract: conditions reported, symptoms described, allergies disclosed, medications mentioned, lifestyle habits, dietary preferences or restrictions",
    "- Do NOT extract: greetings, generic advice, questions without clear patient-specific answers, facts already saved",
    "- Keep each fact concise (one sentence, max 30 words)",
    "- Return an empty facts array if nothing new is worth saving",
    "- Return at most 5 facts — choose only the most clinically significant new ones",
    "",
    "ALREADY SAVED (do NOT duplicate):",
    existing || "Nothing saved yet.",
    "",
    "CONVERSATION:",
    `Patient: ${truncated(userMessage, PATIENT_LIMIT)}`,
    `Assistant: ${truncated(assistantMessage, ASSISTANT_LIMIT)}`,
  ].join("\n");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchExistingFacts(profileId: string): Promise<string> {
  const existing = await memoryRepository.list(profileId, 20);
  if (existing.length === 0) return "";
  return existing.map((m) => `- [${m.category}] ${m.content}`).join("\n");
}

async function extractFacts(
  existing: string,
  userMessage: string,
  assistantMessage: string,
) {
  const { object } = await generateObject({
    model: google("gemini-2.5-flash-lite"),
    schema: extractionSchema,
    prompt: buildPrompt(existing, userMessage, assistantMessage),
    temperature: 0,
    maxOutputTokens: 1024,
  });
  return object.facts;
}

async function saveFacts(
  facts: Array<{ category: string; content: string }>,
  userId: string,
  profileId: string,
  sessionId: string,
) {
  await Promise.all(
    facts.map((f) =>
      memoryRepository.save(userId, profileId, {
        category: f.category as MemoryCategory,
        content: f.content,
        sessionId,
      }),
    ),
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Minimum assistant response length to trigger extraction. */
const MIN_RESPONSE_LENGTH = 50;

/** Extract text from UIMessage response parts. */
export function extractTextFromParts(parts: unknown[]): string {
  return (parts as Array<{ type: string; text?: string }>)
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text!)
    .join("\n");
}

interface ExtractInput {
  userId: string;
  profileId: string;
  sessionId: string;
  userMessage: string;
  assistantMessage: string;
}

async function runExtraction(input: ExtractInput): Promise<number> {
  const existing = await fetchExistingFacts(input.profileId);
  const facts = await extractFacts(
    existing,
    input.userMessage,
    input.assistantMessage,
  );
  if (facts.length === 0) return 0;
  await saveFacts(facts, input.userId, input.profileId, input.sessionId);
  revalidateTag(CacheTags.memories(input.profileId), "seconds");
  console.log(
    `[Memory] Auto-extracted ${facts.length} fact(s) for profile ${input.profileId}`,
  );
  return facts.length;
}

/**
 * Extract and save memorable patient facts from a conversation turn.
 * Returns the number of new facts saved.
 */
export async function extractAndSaveMemories(
  input: ExtractInput,
): Promise<number> {
  if (input.assistantMessage.length < MIN_RESPONSE_LENGTH) {
    console.log(
      `[Memory] Skipping extraction: response too short (${input.assistantMessage.length} chars)`,
    );
    return 0;
  }
  return runExtraction(input);
}
