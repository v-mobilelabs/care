import { z } from "zod";

// ── Guideline Protocol Schema ─────────────────────────────────────────────────

export const GuidelineSchema = z.object({
  id: z.string(),
  /** Category (e.g., "Urological", "Cardiovascular", "Endocrine") */
  category: z.string(),
  /** Condition name */
  condition: z.string(),
  /** ICD-10 code(s) associated with this condition */
  icd10: z.array(z.string()),
  /** Full guideline content (clinical interview track, assessment criteria, investigations, management) */
  content: z.string(),
  /** Keywords for better matching */
  keywords: z.array(z.string()),
  /** Embedding vector (768 dimensions) */
  embedding: z.any(), // Firebase VectorValue type
  /** Source guideline (e.g., "EAU 2023", "AHA 2024") */
  source: z.string(),
  createdAt: z.any(),
  updatedAt: z.any(),
});

export type GuidelineDocument = z.infer<typeof GuidelineSchema>;

export type GuidelineDto = Omit<
  GuidelineDocument,
  "embedding" | "createdAt" | "updatedAt"
>;
