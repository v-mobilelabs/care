import { z } from "zod";

// ── Normalized DTO — outbound ─────────────────────────────────────────────────

/**
 * A single strength/dosage option for a drug, e.g. "500 mg Tab".
 */
export interface DrugStrengthDto {
  label: string; // "500 mg Tab"
  dosage: string; // "500 mg"
  form: string; // "Tablet"
}

/**
 * Normalized drug record returned by our /api/drugs endpoint.
 * Sourced from the NIH NLM Clinical Tables RxTerms API.
 */
export interface DrugDto {
  /** RxNorm Concept Unique Identifiers for this drug entry */
  rxcuis: string[];
  /** Display name, e.g. "metFORMIN (Oral Pill)" */
  name: string;
  /** Available strengths and forms */
  strengths: DrugStrengthDto[];
  /** Primary dose form derived from the name / strengths, e.g. "Tablet" */
  defaultForm: string;
}

// ── Inbound schema ─────────────────────────────────────────────────────────────

export const SearchDrugsSchema = z.object({
  q: z
    .string()
    .min(2, { message: "Search query must be at least 2 characters" })
    .max(100),
  limit: z.coerce.number().int().min(1).max(20).optional().default(10),
});

export type SearchDrugsInput = z.infer<typeof SearchDrugsSchema>;

// ── NLM API response shape (raw) ──────────────────────────────────────────────

/**
 * Raw response from:
 * https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search
 *   ?terms=<q>&ef=RXCUIS,STRENGTHS_AND_FORMS&maxList=<n>
 *
 * [totalCount, names[], { RXCUIS: string[][], STRENGTHS_AND_FORMS: string[][] }, displayNames[][]]
 */
export type NlmRxTermsResponse = [
  number,
  string[],
  {
    RXCUIS: string[][] | null;
    STRENGTHS_AND_FORMS: (string[] | null)[] | null;
  },
  string[][],
];
