// log-vital.tool.ts — Global tool for all agents (client-side: UI handles persistence)
import { tool } from "ai";
import { z } from "zod";

export const logVitalTool = tool({
  description:
    "Log a new vital sign measurement for the patient (e.g. temperature, blood pressure, pulse, SpO2). " +
    "The UI will display the logged vital and persist it.",
  inputSchema: z.object({
    vitalType: z
      .string()
      .describe(
        "Type of vital sign, e.g. temperature, pulse, bloodPressure, spO2",
      ),
    value: z.string().describe("Measured value as a string"),
    unit: z
      .string()
      .optional()
      .describe("Unit of measurement, e.g. °C, mmHg, bpm"),
    timestamp: z
      .string()
      .optional()
      .describe("ISO timestamp of the measurement"),
  }),
  // No execute — client-side tool rendered by the UI
});
