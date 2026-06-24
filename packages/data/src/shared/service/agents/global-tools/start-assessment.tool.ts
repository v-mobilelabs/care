/**
 * startAssessment Tool — Server-side with optional validation.
 *
 * When called by an agent, this tool:
 * 1. Optionally validates assessment questions via lightweight LLM
 * 2. Creates an assessment record in Firestore
 * 3. Returns status to the agent
 *
 * For adaptive assessments, validated questions are stored in the record
 * and the agent uses them in subsequent askQuestion calls.
 */

import { tool, type Tool } from "ai";
import { z } from "zod";
import type { AgentCallOptions } from "@/data/shared/service/agents/base/agent";
import type { ValidatedQuestion } from "@/data/assessments/models/assessment.model";
import { assessmentMetricsService } from "@/data/shared/service/assessment-metrics.service";

// ── Input schema ──────────────────────────────────────────────────────────────

const StartAssessmentInputSchema = z.object({
  title: z
    .string()
    .describe(
      "Assessment name (e.g. 'Chest Pain Assessment', 'Urinary Symptom Evaluation', 'Depression Screening')",
    ),
  condition: z
    .string()
    .describe(
      "The clinical condition being assessed (e.g. 'Acute Coronary Syndrome', 'BPH / LUTS', 'Major Depressive Disorder')",
    ),
  guideline: z
    .string()
    .describe(
      "Primary guideline being followed, with year. Pick the most relevant for the patient's location " +
        "(e.g. 'AHA/ACC 2024 — HEART Score', 'NICE CG97 (2024) — LUTS Assessment', 'ICMR Guidelines 2023')",
    ),
  estimatedQuestions: z
    .number()
    .int()
    .min(1)
    .max(30)
    .describe("Approximate number of questions in this assessment"),
  estimatedMinutes: z
    .string()
    .describe("Estimated time to complete (e.g. '2-3', '3-5', '5-8')"),
});

// ── Factory options type ─────────────────────────────────────────────────────

export type CreateStartAssessmentOptions = {
  adaptiveMode?: boolean;
  validate?: (
    condition: string,
    guideline: string,
    estimatedQuestions: number,
    userId: string,
  ) => Promise<ValidatedQuestion[]>;
  createAssessment?: (input: {
    userId: string;
    sessionId: string;
    title: string;
    condition: string;
    guideline: string;
    estimatedQuestions: number;
    estimatedMinutes: string;
    adaptiveMode?: boolean;
    validatedQuestions?: ValidatedQuestion[];
  }) => Promise<{ id: string }>;
  agentCallOptions?: AgentCallOptions;
};

// ── Helper function to handle validation logic ────────────────────────────────

async function executeValidation(
  input: {
    title: string;
    condition: string;
    guideline: string;
    estimatedQuestions: number;
    estimatedMinutes: string;
  },
  options: CreateStartAssessmentOptions,
): Promise<string> {
  const callOptions = options.agentCallOptions;
  if (!options.adaptiveMode || !options.validate || !callOptions) {
    return "Assessment briefing shown to patient. Proceeding with clinical interview.";
  }

  const assessmentId = `${callOptions.sessionId}-${Date.now()}`;
  try {
    assessmentMetricsService.startValidationTimer(assessmentId);
    const validatedQuestions = await options.validate(
      input.condition,
      input.guideline,
      input.estimatedQuestions,
      callOptions.userId,
    );
    assessmentMetricsService.recordValidation(assessmentId, {
      validationLatencyMs: 0,
      adaptiveMode: true,
      condition: input.condition,
      guideline: input.guideline,
      estimatedQuestions: input.estimatedQuestions,
      sessionId: callOptions.sessionId,
      userId: callOptions.userId,
    });
    assessmentMetricsService.recordAdaptation(
      callOptions.userId,
      callOptions.sessionId,
      input.condition,
      validatedQuestions.length,
    );
    if (options.createAssessment) {
      await options.createAssessment({
        userId: callOptions.userId,
        sessionId: callOptions.sessionId,
        title: input.title,
        condition: input.condition,
        guideline: input.guideline,
        estimatedQuestions: input.estimatedQuestions,
        estimatedMinutes: input.estimatedMinutes,
        adaptiveMode: true,
        validatedQuestions,
      });
      return `Assessment briefing shown with ${validatedQuestions.length} validated questions. Proceeding with clinical interview.`;
    }
    return "Assessment briefing shown with validated framework. Proceeding with clinical interview.";
  } catch (error) {
    assessmentMetricsService.recordValidationError(
      assessmentId,
      error instanceof Error ? error : new Error(String(error)),
      {
        userId: callOptions.userId,
        sessionId: callOptions.sessionId,
        condition: input.condition,
      },
    );
    return "Assessment briefing shown. Proceeding with interview (validation skipped due to error).";
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Create startAssessmentTool with optional validation support.
 * When `adaptiveMode` is true, calls the validation service to generate AI-validated questions.
 */
export function createStartAssessmentTool(
  options?: CreateStartAssessmentOptions,
): Tool<
  {
    title: string;
    condition: string;
    guideline: string;
    estimatedQuestions: number;
    estimatedMinutes: string;
  },
  string
> {
  return tool({
    description:
      "Show a pre-assessment briefing card BEFORE starting a structured clinical assessment. " +
      "Call this ONCE when you identify a condition that warrants a guideline-driven interview " +
      "(e.g. chest pain → HEART score, urinary symptoms → IPSS, mood → PHQ-9). " +
      "This card tells the patient what to expect: assessment name, guideline, question count, and time. " +
      "LOCATION-BASED GUIDELINES — pick the most relevant body for the patient's country: " +
      "India → ICMR, IAP, API, CSI; " +
      "US → AHA, ACC, ADA, ACS, USPSTF; " +
      "UK → NICE, BNF, SIGN; " +
      "Europe → ESC, EAU, EASD; " +
      "Australia → RACGP, NHF; " +
      "International/unknown → WHO, GOLD, GINA. " +
      "Always include the guideline year if known (e.g. 'NICE CG181 (2024)'). " +
      "After this tool call, proceed immediately with the first askQuestion.",
    inputSchema: StartAssessmentInputSchema,
    execute: (input) => executeValidation(input, options ?? {}),
  });
}

// ── Default export (client-side only, no validation) ────────────────────────

export const startAssessmentTool = tool({
  description:
    "Show a pre-assessment briefing card BEFORE starting a structured clinical assessment. " +
    "Call this ONCE when you identify a condition that warrants a guideline-driven interview " +
    "(e.g. chest pain → HEART score, urinary symptoms → IPSS, mood → PHQ-9). " +
    "This card tells the patient what to expect: assessment name, guideline, question count, and time. " +
    "LOCATION-BASED GUIDELINES — pick the most relevant body for the patient's country: " +
    "India → ICMR, IAP, API, CSI; " +
    "US → AHA, ACC, ADA, ACS, USPSTF; " +
    "UK → NICE, BNF, SIGN; " +
    "Europe → ESC, EAU, EASD; " +
    "Australia → RACGP, NHF; " +
    "International/unknown → WHO, GOLD, GINA. " +
    "Always include the guideline year if known (e.g. 'NICE CG181 (2024)'). " +
    "After this tool call, proceed immediately with the first askQuestion.",
  inputSchema: StartAssessmentInputSchema,
  execute: async () =>
    "Assessment briefing shown to patient. Proceed with the first askQuestion.",
});

export type StartAssessmentInput = z.infer<typeof StartAssessmentInputSchema>;
