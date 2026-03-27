/**
 * Validate assessment questions via lightweight LLM.
 *
 * When an assessment is created, use this service to validate that the
 * specialist agent's planned questions align with the clinical guideline
 * and make sense for the condition. This pre-validation ensures:
 *
 * - Questions are clinically relevant
 * - Questions follow the guideline protocol
 * - No duplicate or redundant questions
 * - Questions are answerable and not ambiguous
 *
 * Uses lightweight (Flash-lite) LLM with low thinking to keep latency
 * and token cost minimal (~150-200ms per validation).
 */

import { z } from "zod";
import { AIService } from "@/data/shared/service/ai.service";

// ── Schemas ───────────────────────────────────────────────────────────────────

export interface ValidatedQuestion {
  question: string;
  type: "text" | "choice" | "scale" | "binary";
  options?: string[];
  rationale?: string;
}

const ValidatedQuestionSchema = z.object({
  question: z.string().min(10).describe("The clinical question to ask"),
  type: z
    .enum(["text", "choice", "scale", "binary"])
    .describe("Question response type"),
  options: z
    .array(z.string())
    .optional()
    .describe("For choice questions: list of options"),
  rationale: z
    .string()
    .optional()
    .describe("Why this question is clinically important"),
});

const ValidatedQuestionsSchema = z.object({
  validatedQuestions: z
    .array(ValidatedQuestionSchema)
    .min(3)
    .max(30)
    .describe("Validated clinical questions for the assessment"),
  validationNotes: z
    .string()
    .optional()
    .describe("Any adjustments or recommendations"),
});

// ── Service ───────────────────────────────────────────────────────────────────

export class ValidateAssessmentQuestionsService {
  constructor(private aiService: AIService) {}

  /**
   * Validate assessment questions via lightweight LLM.
   *
   * @param condition - The clinical condition (e.g. "Acute Chest Pain")
   * @param guideline - The guideline being followed (e.g. "AHA/ACC 2024 HEART Score")
   * @param estimatedCount - Expected number of questions
   * @param userId - For credit tracking
   * @returns Validated questions with rationale
   */
  async validate(
    condition: string,
    guideline: string,
    estimatedCount: number,
    userId: string,
  ): Promise<ValidatedQuestion[]> {
    const prompt = `
You are a clinical question validator. Your job is to ensure assessment questions are:
- Clinically relevant and evidence-based
- Aligned with the guideline
- Not redundant or overlapping
- Clear and unambiguous
- Answerable by patients without medical training

Condition: ${condition}
Guideline: ${guideline}
Expected question count: ${estimatedCount}

Generate ${estimatedCount} clinical assessment questions that:
1. Follow the ${guideline} protocol
2. Are diagnostic/prognostic for ${condition}
3. Progress logically (vital signs → symptoms → history → risk factors)
4. Use standardized question types (text, choice, scale 1-10, yes/no)
5. Are specific enough to be clinically useful

Return the questions with validation notes.
`;

    const result = await this.aiService.extractObject(
      ValidatedQuestionsSchema,
      [{ role: "user", content: prompt }],
      {
        userId,
        useLite: true, // Use flash-lite for speed
        skipCredit: true, // No charge for assessment validation
      },
    );

    return result.validatedQuestions;
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let instance: ValidateAssessmentQuestionsService | null = null;

export function getValidateAssessmentQuestionsService(
  aiService: AIService,
): ValidateAssessmentQuestionsService {
  if (!instance) {
    instance = new ValidateAssessmentQuestionsService(aiService);
  }
  return instance;
}
