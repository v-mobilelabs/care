/**
 * Submit Referral Request Tool — Ask user to confirm specialist handoff.
 *
 * After a report is submitted with a handoff recommendation, this tool
 * presents the referral to the user and waits for their confirmation
 * before routing to the specialist.
 */

import { tool, zodSchema } from "ai";
import { z } from "zod";

const SubmitReferralRequestSchema = z.object({
  nextSpecialist: z
    .string()
    .min(1)
    .describe(
      "Target specialist to refer to (e.g., 'dentistry', 'cardiology', 'endocrinology')",
    ),
  reason: z
    .string()
    .describe("Clinical reason for the referral in plain language"),
  reportLabel: z
    .string()
    .optional()
    .describe("Label of the report that prompted the referral"),
});

export type SubmitReferralRequestInput = z.infer<
  typeof SubmitReferralRequestSchema
>;

function buildReferralAcknowledgement(input: SubmitReferralRequestInput) {
  return {
    status: "pending_confirmation" as const,
    nextSpecialist: input.nextSpecialist,
    reason: input.reason,
    reportLabel: input.reportLabel,
    message: `You have been referred to a ${input.nextSpecialist} specialist. Would you like to proceed?`,
  };
}

/**
 * Global submitReferralRequest tool available to specialist agents.
 * Presents a referral confirmation to the user without auto-routing.
 */
export function createSubmitReferralRequestTool() {
  return tool({
    description:
      "Submit a referral request to another specialist. " +
      "This displays a confirmation message to the user and waits for their approval " +
      "before routing to the referred specialist on the next turn.",
    inputSchema: zodSchema(SubmitReferralRequestSchema),
    execute: async (input) => buildReferralAcknowledgement(input),
  });
}

/**
 * Pre-instantiated global submitReferralRequest tool.
 */
export const submitReferralRequestTool = createSubmitReferralRequestTool();
