import { z } from "zod";
import { aiService, type AIService } from "@/data/shared/service/ai.service";

const LlmNormalizedSymptomsSchema = z.object({
  normalizedTerms: z.array(z.string().min(1)).min(1).max(100),
});

function cleanLlmTerm(value: string): string {
  return value.replaceAll(/\s+/g, " ").trim();
}

function buildPrompt(terms: string[]): string {
  const bulletTerms = terms
    .map((term, index) => `${index + 1}. ${term}`)
    .join("\n");

  return [
    "You normalize patient-facing symptom phrases into concise doctor-facing clinical terminology.",
    "Rules:",
    "- Keep meaning exactly the same.",
    "- Do NOT diagnose or add new symptoms.",
    "- Use standard medical terms where appropriate.",
    "- Keep each term concise (2-5 words when possible).",
    "- Return one normalized term per input in the same order.",
    "- Preserve useful qualifiers if present (e.g., left-sided, acute).",
    "",
    "Input terms:",
    bulletTerms,
  ].join("\n");
}

export async function normalizeClinicalTermsWithLlm(args: {
  userId: string;
  terms: string[];
  ai?: AIService;
}): Promise<string[]> {
  const nonEmptyTerms = args.terms
    .map((term) => term.trim())
    .filter((term) => term.length > 0);

  if (nonEmptyTerms.length === 0) return [];

  const result = await (args.ai ?? aiService).extractObject(
    LlmNormalizedSymptomsSchema,
    [{ role: "user", content: buildPrompt(nonEmptyTerms) }],
    {
      userId: args.userId,
      useLite: true,
      skipCredit: true,
    },
  );

  if (result.normalizedTerms.length !== nonEmptyTerms.length) {
    throw new Error(
      `LLM symptom normalization returned ${result.normalizedTerms.length} terms for ${nonEmptyTerms.length} inputs.`,
    );
  }

  return result.normalizedTerms.map((term) => cleanLlmTerm(term));
}
