import { z } from "zod";

// ── Extraction result schema ──────────────────────────────────────────────────

export const InsuranceExtractionSchema = z.object({
  providerName: z
    .string()
    .optional()
    .describe("Insurance company / provider name"),
  planName: z.string().optional().describe("Plan name if visible"),
  policyNumber: z
    .string()
    .optional()
    .describe("Policy number or plan ID on the card"),
  groupNumber: z.string().optional().describe("Group number if present"),
  memberId: z
    .string()
    .optional()
    .describe("Member ID or beneficiary ID on the card"),
  subscriberName: z
    .string()
    .optional()
    .describe("Primary subscriber / insured person name"),
  type: z
    .enum(["health", "dental", "vision", "life", "disability", "other"])
    .optional()
    .describe(
      "Type of insurance inferred from the card (health/dental/vision/life/disability/other)",
    ),
  effectiveDate: z
    .string()
    .optional()
    .describe("Coverage effective date in YYYY-MM-DD format"),
  expirationDate: z
    .string()
    .optional()
    .describe("Coverage expiration date in YYYY-MM-DD format"),
  copay: z
    .number()
    .nonnegative()
    .optional()
    .describe("Copay amount in dollars if visible"),
  deductible: z
    .number()
    .nonnegative()
    .optional()
    .describe("Annual deductible in dollars if visible"),
  outOfPocketMax: z
    .number()
    .nonnegative()
    .optional()
    .describe("Annual out-of-pocket maximum in dollars if visible"),
});

export type InsuranceExtractResult = z.infer<typeof InsuranceExtractionSchema>;

// ── Upload + extraction input ─────────────────────────────────────────────────

export const ExtractInsuranceInputSchema = z.object({
  userId: z.string().min(1),
  /** GCS storage path of the already-uploaded draft file */
  storagePath: z.string().min(1),
  mimeType: z.string().min(1),
});

export type ExtractInsuranceInput = z.infer<typeof ExtractInsuranceInputSchema>;
