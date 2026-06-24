/**
 * Search Patient Records Tool — Tri-Store semantic RAG search over patient medical records.
 *
 * Searches across three weighted clinical stores in parallel:
 *   1. condition_store  (weight 1.0) — conditions, medications, prescriptions, profile
 *   2. symptom_store    (weight 0.7) — symptom observations, assessments, vitals, labs, SOAP
 *   3. kb_store         (weight 0.4) — clinical knowledge base, guidelines, protocols
 *
 * Every returned chunk is tagged with a provenance label for 2026 regulatory traceability:
 *   [Source: Patient Condition Store → Active diagnosis: PCOS (Active)]
 */

import { tool, zodSchema } from "ai";
import { z } from "zod";
import { ragContextBuilder } from "@/data/shared/service/rag/rag-context-builder.service";

export function createSearchPatientRecordsTool(
  userId: string,
  profileId: string,
) {
  return tool({
    description:
      "Search the patient's medical records using tri-store semantic search (RAG). " +
      "Searches three weighted stores in parallel: " +
      "(1) condition_store — active conditions, medications, prescriptions, profile [weight 1.0]; " +
      "(2) symptom_store — symptom observations, assessments, vitals, blood tests, SOAP notes [weight 0.7]; " +
      "(3) kb_store — clinical knowledge base, guidelines, protocols [weight 0.4]. " +
      "Returns provenance-tagged context for clinical reasoning and regulatory traceability. " +
      "Examples: 'recent blood pressure', 'medication history', 'past diagnoses', 'lab results trends'.",
    inputSchema: zodSchema(
      z.object({
        query: z
          .string()
          .describe(
            "Natural language search query about the patient's medical records. Be specific.",
          ),
        rerank: z
          .boolean()
          .optional()
          .describe(
            "Use Vertex AI Ranking API reranking for higher precision (default: true, slightly slower).",
          ),
        broaden: z
          .boolean()
          .optional()
          .describe(
            "Broaden search candidates for repair/fallback scenarios (default: false).",
          ),
      }),
    ),
    execute: async ({ query, rerank = true, broaden = false }) => {
      try {
        const result = await ragContextBuilder.buildTriStoreContext({
          userId,
          profileId,
          query,
          rerank,
          broaden,
        });

        const total =
          result.conditionCount + result.symptomCount + result.kbCount;

        return {
          found: total > 0,
          count: total,
          context: result.context,
          summary:
            total > 0
              ? `Retrieved ${result.conditionCount} condition/medication records, ` +
                `${result.symptomCount} symptom/biomarker records, and ` +
                `${result.kbCount} clinical knowledge base entries.`
              : "No relevant records found for this query.",
          store_breakdown: {
            condition: result.conditionCount,
            symptom: result.symptomCount,
            kb: result.kbCount,
          },
          provenance: result.provenance,
        };
      } catch (error) {
        return {
          found: false,
          count: 0,
          context: "",
          summary: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          store_breakdown: { condition: 0, symptom: 0, kb: 0 },
          provenance: [],
        };
      }
    },
  });
}
