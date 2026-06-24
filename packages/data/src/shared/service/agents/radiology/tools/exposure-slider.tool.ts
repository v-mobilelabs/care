/**
 * Exposure Slider Tool — Radiology specialist tool
 *
 * Prompts the user to adjust the simulated exposure level of an X-ray image in the UI.
 * Returns the confirmed exposure value.
 */

import { tool, zodSchema } from "ai";
import { z } from "zod";

export const exposureSliderTool = tool({
  description:
    "Ask the patient or assistant to adjust or rate the simulated exposure quality of the medical image using the interactive exposure slider. " +
    "Returns the selected exposure value (0 to 10).",
  inputSchema: zodSchema(
    z.object({
      min: z.number().optional().default(0).describe("Minimum exposure level"),
      max: z.number().optional().default(10).describe("Maximum exposure level"),
      step: z.number().optional().default(1).describe("Step increment"),
      defaultValue: z
        .number()
        .optional()
        .default(5)
        .describe("Initial default exposure level"),
      promptText: z
        .string()
        .describe(
          "A helpful message explaining why we need them to adjust the exposure",
        ),
    }),
  ),
  // No execute — client-side tool rendered by the UI that submits answer back
});
