/**
 * Ask Question Tool — Interactive clinical follow-up UI
 *
 * Renders structured question UI (Yes/No buttons, chips, sliders, free text)
 * instead of plain assistant text. Use this for ALL clinical follow-up
 * questions to give the patient a better interactive experience.
 */

import { tool, zodSchema } from "ai";
import { z } from "zod";

export const askQuestionTool = tool({
  description:
    "Ask the patient a structured clinical follow-up question. Use this for ALL follow-up questions — " +
    "it renders interactive UI (Yes/No buttons, chips, or a slider) instead of plain text. " +
    "Choose the type that best fits the question. " +
    "PREFER single_choice or multi_choice over free_text wherever possible — " +
    "only use free_text when the answer cannot be covered by a finite option list. " +
    "Rules: asking about age → single_choice with options ['Under 18', '18–29', '30–44', '45–59', '60–74', '75 or older']; " +
    "asking about health goals → single_choice with goal options; " +
    "asking about symptoms → multi_choice with options; " +
    "asking about pain level or severity → scale; " +
    "asking about location/country → free_text. " +
    "STANDARDISED OPTION SETS — always use these exact labels when asking about these topics: " +
    "temperature → ['Normal (below 37.5°C)', 'Low-grade fever (37.5–38.5°C)', 'High fever (38.5–40°C)', 'Very high (above 40°C)', 'Haven't measured']; " +
    "pain character → ['Sharp / stabbing', 'Dull / aching', 'Burning', 'Throbbing / pulsating', 'Cramping', 'Pressure / tightness']; " +
    "severity → ['Mild', 'Moderate', 'Severe']; " +
    "onset → ['Sudden (minutes to hours)', 'Gradual (days)', 'Chronic / ongoing (weeks or more)'].",
  inputSchema: zodSchema(
    z.object({
      question: z.string().describe("The clinical question to ask the patient"),
      type: z
        .enum(["yes_no", "single_choice", "multi_choice", "scale", "free_text"])
        .describe(
          "yes_no: binary Yes/No; single_choice: pick one option; multi_choice: pick multiple options; " +
            "scale: numeric slider (e.g. pain 0-10, IPSS 0-35); free_text: open-ended text",
        ),
      options: z
        .array(z.string())
        .optional()
        .describe("Options list for single_choice or multi_choice types"),
      scaleMin: z
        .number()
        .optional()
        .describe("Minimum value for scale type (default 0)"),
      scaleMax: z
        .number()
        .optional()
        .describe("Maximum value for scale type (default 10)"),
      scaleMinLabel: z
        .string()
        .optional()
        .describe("Label for the minimum scale value (e.g. 'No symptoms')"),
      scaleMaxLabel: z
        .string()
        .optional()
        .describe("Label for the maximum scale value (e.g. 'Worst possible')"),
    }),
  ),
  // No execute — client-side tool. The UI renders the question from the
  // tool-call args and the patient's answer is returned via addToolOutput.
});
