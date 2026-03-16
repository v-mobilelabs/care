/**
 * Start Assessment Tool — Pre-assessment briefing card
 *
 * Called by the clinical agent BEFORE starting a structured clinical
 * assessment. Renders a card showing the assessment name, guideline
 * source, estimated questions/time, and a brief explanation — building
 * user confidence that a real medical protocol is being followed.
 *
 * Guideline sources are location-aware: the agent picks the most
 * appropriate body (e.g. NICE for UK, AHA for US, ICMR for India).
 */

import { tool, zodSchema } from "ai";
import { z } from "zod";

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
  inputSchema: zodSchema(
    z.object({
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
    }),
  ),
  execute: async () =>
    "Assessment briefing shown to patient. Proceed with the first askQuestion.",
});
