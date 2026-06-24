/**
 * Tri-Store Semantic Layer — Types.
 *
 * Three stores with explicit weights reflect the clinical trust hierarchy:
 *
 *   condition_store  (1.0) — Patient's active clinical profile:
 *                            conditions, medications, prescriptions, profile, patient
 *
 *   symptom_store    (0.7) — Observed symptom/biomarker timeline:
 *                            symptom-observations, assessments, vitals, blood tests, SOAP
 *
 *   kb_store         (0.4) — General clinical knowledge base:
 *                            guidelines, drug references, protocols (global, not patient-specific)
 *
 * For regulatory traceability (2026 AI audit requirements), every context chunk
 * is tagged with <source store="..." weight="..." label="..."> so the LLM can
 * surface provenance verbatim in its responses.
 */

import type { SearchResult } from "./rag.types";
import type { KBSearchResult } from "@/data/knowledge-base/service/knowledge-base.service";

export type TriStoreId = "condition_store" | "symptom_store" | "kb_store";

// ── Store weights ─────────────────────────────────────────────────────────────

export const TRI_STORE_WEIGHTS: Record<TriStoreId, number> = {
  condition_store: 1.0,
  symptom_store: 0.7,
  kb_store: 0.4,
};

// ── Store display names ───────────────────────────────────────────────────────

export const TRI_STORE_LABELS: Record<TriStoreId, string> = {
  condition_store: "Patient Condition Store",
  symptom_store: "Patient Symptom Store",
  kb_store: "Clinical Knowledge Base",
};

// ── Provenance record — one per chunk ────────────────────────────────────────

export interface TriStoreProvenance {
  /** Which of the three stores this chunk originated from */
  store: TriStoreId;
  /** Weight applied (0–1) */
  weight: number;
  /**
   * Human-readable traceability label.
   * Examples:
   *   "Patient Condition Store → Active diagnosis: Type 2 Diabetes"
   *   "Patient Symptom Store → Reported symptom: Irregular periods [pattern: PCOS, anovulation]"
   *   "Clinical Knowledge Base → Clinical guideline: Nutrition: PCOS dietary management"
   */
  label: string;
  /** Firestore sourceId for the originating document */
  sourceId: string;
  /** RAG chunk type (e.g. "condition", "vital", "medication") or "kb" */
  chunkType: string;
}

// ── Result returned by TriStoreRagService.buildTriStoreContext() ──────────────

export interface TriStoreContextResult {
  /**
   * Fully formatted context string ready for LLM injection.
   * Each chunk is wrapped in:
   *   <source store="..." weight="..." label="...">...</source>
   * and arranged in descending store-weight order (condition → symptom → kb).
   */
  context: string;
  /**
   * Flat ordered list of provenance entries — mirrors the sections inserted into
   * `context`. Used by the agentic RAG pipeline to surface citations and to
   * persist structured grounding metadata for audit.
   */
  provenance: TriStoreProvenance[];
  /** Count from the condition store */
  conditionCount: number;
  /** Count from the symptom store */
  symptomCount: number;
  /** Count from the KB store */
  kbCount: number;
  /** True when at least one store failed gracefully (partial results returned) */
  partialFailure: boolean;
  /**
   * Combined raw results from condition_store + symptom_store.
   * Exposed for downstream pipeline components (e.g. retrieval evaluator)
   * that need scored `SearchResult` objects for heuristic scoring.
   */
  allPatientResults: SearchResult[];
  /**
   * Raw KB results.
   * Exposed for downstream pipeline components (e.g. retrieval evaluator).
   */
  allKbResults: KBSearchResult[];
}
