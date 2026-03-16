/**
 * Submit Blood Test Analysis Tool — Captures the AI's structured interpretation
 * of a patient's blood test results.
 */

import { tool, zodSchema } from "ai";
import { z } from "zod";

// ── Analysis schema ───────────────────────────────────────────────────────────

const BiomarkerFindingSchema = z.object({
  name: z.string().describe("Biomarker name e.g. Haemoglobin, LDL Cholesterol"),
  value: z.string().describe("Measured value with unit e.g. '12.5 g/dL'"),
  status: z
    .enum(["normal", "low", "high", "critical"])
    .describe("Status compared to reference range"),
  interpretation: z
    .string()
    .describe(
      "Plain-language explanation of what this value means for the patient",
    ),
});

const PanelAnalysisSchema = z.object({
  panelName: z
    .string()
    .describe(
      "Name of the test panel e.g. Complete Blood Count, Lipid Profile",
    ),
  findings: z
    .array(BiomarkerFindingSchema)
    .describe("Individual biomarker findings within this panel"),
  summary: z
    .string()
    .describe("Overall panel interpretation in plain language"),
});

export const SubmitBloodTestAnalysisSchema = z.object({
  panels: z
    .array(PanelAnalysisSchema)
    .min(1)
    .describe("Analysis grouped by test panel"),
  overallAssessment: z
    .string()
    .describe(
      "Overall clinical assessment summarising all findings in warm, plain language",
    ),
  recommendations: z
    .array(z.string())
    .optional()
    .describe(
      "Recommended follow-up actions e.g. repeat test in 3 months, dietary changes",
    ),
  criticalFindings: z
    .array(z.string())
    .optional()
    .describe(
      "Any critical values requiring immediate medical attention — listed separately for emphasis",
    ),
});

export type SubmitBloodTestAnalysisInput = z.infer<
  typeof SubmitBloodTestAnalysisSchema
>;

// ── Tool factory ──────────────────────────────────────────────────────────────

export function createSubmitBloodTestAnalysisTool() {
  return tool({
    description:
      "Submit the complete, structured blood test analysis. Call this EXACTLY ONCE with your full interpretation of all panels and biomarkers.",
    inputSchema: zodSchema(SubmitBloodTestAnalysisSchema),
    execute: async (analysis) => {
      const totalFindings = (
        analysis as SubmitBloodTestAnalysisInput
      ).panels.reduce((sum, p) => sum + p.findings.length, 0);
      const criticalCount =
        (analysis as SubmitBloodTestAnalysisInput).criticalFindings?.length ??
        0;

      return {
        status: "accepted",
        panelCount: (analysis as SubmitBloodTestAnalysisInput).panels.length,
        totalFindings,
        criticalCount,
      } as const;
    },
  });
}
