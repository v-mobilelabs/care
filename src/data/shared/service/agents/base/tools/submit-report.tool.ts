/**
 * Submit Report Tool — Global tool for any agent to save diagnostic reports.
 *
 * Used by radiology, lab analysis, and specialist agents to submit
 * structured diagnostic reports that are persisted as message parts.
 * Reports become part of the session context for follow-up turns.
 */

import { tool, zodSchema } from "ai";
import { z } from "zod";

// ── Report schema ─────────────────────────────────────────────────────────────

const ReportSectionSchema = z.object({
  key: z.string().describe("Stable machine key for the section"),
  title: z.string().describe("Human-readable section title"),
  content: z
    .string()
    .describe("Section content in concise professional language"),
  priority: z
    .enum(["low", "medium", "high", "critical"])
    .optional()
    .describe("Optional section priority for downstream triage"),
});

const ClinicalObservationSchema = z.object({
  name: z.string().describe("Observation name, biomarker, or measure"),
  value: z.string().describe("Observed value"),
  unit: z.string().optional().describe("Measurement unit if applicable"),
  status: z
    .enum(["normal", "abnormal", "high", "low", "critical", "unknown"])
    .optional()
    .describe("Clinical status of this observation"),
  referenceRange: z
    .string()
    .optional()
    .describe("Reference range when relevant"),
  note: z
    .string()
    .optional()
    .describe("Optional interpretation note for this observation"),
});

const ClinicalCodeSchema = z.object({
  system: z
    .string()
    .describe("Clinical coding system (e.g., ICD-10, SNOMED, LOINC, CPT)"),
  code: z.string().describe("Code identifier in the coding system"),
  display: z.string().optional().describe("Human-readable code description"),
});

const ReportMetadataValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

const ReportHandoffSchema = z.object({
  nextSpecialist: z
    .string()
    .min(1)
    .describe("Target specialist agent for the next step"),
  autoRoute: z
    .boolean()
    .optional()
    .describe("When true, gateway should auto-route to nextSpecialist"),
  reason: z
    .string()
    .optional()
    .describe("Optional short rationale for the specialist handoff"),
});

export const SubmitReportSchema = z.object({
  specialty: z
    .string()
    .min(1)
    .describe(
      "Specialty producing this report (e.g., radiology, dentistry, cardiology, endocrinology)",
    ),
  reportType: z
    .enum([
      "radiology",
      "lab_analysis",
      "specialist_assessment",
      "pathology",
      "genetic_counseling",
      "other",
    ])
    .describe("Type of report being submitted"),
  title: z
    .string()
    .describe(
      "Report title summarizing the findings (e.g. 'OPG Analysis: Dental Issues Identified')",
    ),
  reportLabel: z
    .string()
    .optional()
    .describe(
      "AI-generated display label such as 'OPG Report', 'X-ray Report', 'Blood Report', or 'MRI Report'",
    ),
  findings: z
    .string()
    .describe(
      "Detailed clinical findings in plain language. For radiology: describe what was visualized. For labs: summarize abnormal values.",
    ),
  summary: z
    .string()
    .describe(
      "Executive summary of the report — key takeaways for the patient",
    ),
  recommendations: z
    .array(z.string())
    .optional()
    .describe(
      "Recommended follow-up actions, treatments, or next specialist to consult",
    ),
  criticalFindings: z
    .array(z.string())
    .optional()
    .describe(
      "Any critical or urgent findings requiring immediate medical attention",
    ),
  suggestedNextSpecialist: z
    .string()
    .optional()
    .describe(
      "Specialist agent to route to next (e.g., 'dentistry', 'cardiology', 'endocrinology'). Helps gateway routing for follow-up turns.",
    ),
  modality: z
    .string()
    .optional()
    .describe(
      "Imaging modality when relevant (e.g., OPG, X-ray, CT, MRI, Ultrasound)",
    ),
  anatomicalRegion: z
    .string()
    .optional()
    .describe(
      "Primary anatomical region assessed (e.g., left mandible, chest, lumbar spine)",
    ),
  technique: z
    .string()
    .optional()
    .describe(
      "Acquisition context and technical quality notes (e.g., AP view, suboptimal rotation)",
    ),
  comparisonStudy: z
    .string()
    .optional()
    .describe(
      "Comparison to prior imaging/report if available, otherwise state 'none available'",
    ),
  structuredFindings: z
    .array(z.string())
    .optional()
    .describe(
      "Objective, itemized findings suitable for clinical review by other agents and doctors",
    ),
  impression: z
    .string()
    .optional()
    .describe(
      "Professional radiology-style impression statement summarizing the most likely diagnosis",
    ),
  differentialDiagnosis: z
    .array(z.string())
    .optional()
    .describe(
      "Optional differential diagnoses when findings are non-specific or uncertain",
    ),
  limitations: z
    .string()
    .optional()
    .describe(
      "Important interpretation limitations (e.g., image quality, incomplete views, need for clinical correlation)",
    ),
  urgency: z
    .enum(["routine", "urgent", "emergency"])
    .optional()
    .describe("Clinical urgency classification for downstream triage"),
  recommendedFollowUp: z
    .array(z.string())
    .optional()
    .describe(
      "Recommended next investigations, consultations, or treatment follow-up",
    ),
  reportVersion: z
    .enum(["preliminary", "final"])
    .optional()
    .describe(
      "Report maturity for review workflows and future doctor validation",
    ),
  sections: z
    .array(ReportSectionSchema)
    .optional()
    .describe(
      "Generic, extensible report sections for specialty-specific structure",
    ),
  observations: z
    .array(ClinicalObservationSchema)
    .optional()
    .describe("Structured observations to support robust downstream parsing"),
  clinicalCodes: z
    .array(ClinicalCodeSchema)
    .optional()
    .describe("Optional coded terms for interoperability and future review"),
  review: z
    .object({
      intendedReviewers: z
        .array(z.string())
        .optional()
        .describe("Who should review this report (agents or clinician roles)"),
      requiresHumanReview: z
        .boolean()
        .optional()
        .describe("Whether this report should be flagged for clinician review"),
      confidence: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe("Optional confidence score between 0 and 1"),
    })
    .optional()
    .describe("Review workflow metadata"),
  metadata: z
    .record(z.string(), ReportMetadataValueSchema)
    .optional()
    .describe("Flexible key/value metadata for any specialty-specific details"),
  tags: z
    .array(z.string())
    .optional()
    .describe("Optional searchable tags for indexing and retrieval"),
  handoff: ReportHandoffSchema.optional().describe(
    "Optional structured handoff contract for automatic specialist routing",
  ),
});

export type SubmitReportInput = z.infer<typeof SubmitReportSchema>;

function toReportLabel(report: SubmitReportInput): string {
  if (report.reportLabel && report.reportLabel.trim().length > 0) {
    return report.reportLabel.trim();
  }
  if (report.modality && report.modality.trim().length > 0) {
    return `${report.modality.trim()} Report`;
  }
  if (report.reportType === "lab_analysis") return "Blood Report";
  return `${report.reportType.replaceAll("_", " ")} Report`;
}

function resolveHandoff(report: SubmitReportInput) {
  const nextSpecialist =
    report.handoff?.nextSpecialist ?? report.suggestedNextSpecialist ?? null;
  return {
    nextSpecialist,
    autoRoute: report.handoff?.autoRoute ?? (nextSpecialist ? true : false),
    reason: report.handoff?.reason ?? null,
  };
}

function buildReportAcknowledgement(report: SubmitReportInput) {
  const timestamp = new Date().toISOString();
  const reportRef = `${report.specialty}:${report.reportType}:${timestamp}`;
  const handoff = resolveHandoff(report);

  return {
    status: "accepted" as const,
    reportRef,
    specialty: report.specialty,
    reportType: report.reportType,
    title: report.title,
    reportLabel: toReportLabel(report),
    sectionCount: report.sections?.length ?? 0,
    observationCount: report.observations?.length ?? 0,
    criticalFindings: report.criticalFindings?.length ?? 0,
    recommendations: report.recommendations?.length ?? 0,
    nextSpecialist: handoff.nextSpecialist,
    autoRoute: handoff.autoRoute,
    handoffReason: handoff.reason,
    urgency: report.urgency ?? "routine",
    reportVersion: report.reportVersion ?? "preliminary",
  };
}

// ── Tool factory ──────────────────────────────────────────────────────────────

/**
 * Global submitReport tool available to all agents.
 * No per-request context needed — the agent creates and executes the report.
 */
export function createSubmitReportTool() {
  return tool({
    description:
      "Submit a common, dynamic, and robust clinical report envelope that works across all specialties. " +
      "Use core fields (specialty, reportType, title, findings, summary) and optionally add sections, observations, codes, and metadata. " +
      "This report is designed for downstream agent processing and future human-doctor review.",
    inputSchema: zodSchema(SubmitReportSchema),
    execute: async (input) =>
      buildReportAcknowledgement(input as SubmitReportInput),
  });
}

/**
 * Pre-instantiated global submitReport tool.
 * Export for use in agent buildTools() functions.
 */
export const submitReportTool = createSubmitReportTool();
