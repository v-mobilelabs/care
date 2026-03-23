/**
 * Action Card Tool — Client-side tool (no execute).
 *
 * The AI agent calls this tool to surface a compact checklist of actionable
 * steps the patient can follow. The client renders it inline in the chat
 * as an interactive card with checkboxes and an optional medical disclaimer.
 */

import { tool } from "ai";
import { z } from "zod";

const ActionCardInputSchema = z.object({
  title: z
    .string()
    .describe(
      "Card heading summarising the action steps (e.g. 'Steps to help you right now')",
    ),
  items: z
    .array(z.string())
    .min(1)
    .max(10)
    .describe("Ordered list of action steps for the patient to follow"),
  disclaimer: z
    .string()
    .optional()
    .describe(
      "Optional medical disclaimer shown at the bottom of the card (e.g. 'This assessment is for informational purposes only…')",
    ),
});

export type ActionCardInput = z.infer<typeof ActionCardInputSchema>;

export const actionCard = tool({
  description:
    "Display an actionable checklist card to the patient. Use this when you want to " +
    "present a clear set of steps the patient should follow — medication instructions, " +
    "lifestyle changes, next-appointment reminders, or post-assessment guidance. " +
    "The card renders as an interactive checklist so the patient can track their progress. " +
    "Always include a medical disclaimer when giving health advice.",
  inputSchema: ActionCardInputSchema,
  execute: async (input) =>
    `Action card (${input.items.length} items) rendered to patient.`,
});
