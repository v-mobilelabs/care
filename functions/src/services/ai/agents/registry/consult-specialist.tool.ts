/**
 * Consult Specialist Tool
 *
 * The single tool exposed on the Router Agent.
 * One tool regardless of how many specialties exist — keeps router context
 * lean and prevents model confusion from a large tool set.
 *
 * The router selects a typed `Specialty` enum value; the registry resolves
 * and executes the correct ToolLoopAgent. The UI sees full streamed output
 * (character-by-character); the router only sees the final text summary via `toModelOutput`.
 */

import { tool, smoothStream, readUIMessageStream } from "ai";
import { z } from "zod";
import { Specialty, SPECIALTY_META } from "./specialty.enum.js";
import { getSpecialistAgent } from "./agent-registry.js";

// Get string values from Specialty enum for Zod schema
const specialtyValues = Object.values(Specialty) as [string, ...string[]];

export const consultSpecialistTool = tool({
  description: `Consult a specialist agent for a specific medical domain.
Choose the specialty that best matches the clinical query.
Available specialties and their scope:
${Object.values(Specialty)
  .map((s) => `- ${s}: ${SPECIALTY_META[s].description}`)
  .join("\n")}`,
  inputSchema: z.object({
    specialty: z
      .enum(specialtyValues)
      .describe(
        "The medical specialty to consult — must exactly match one of the enum values",
      )
      .transform((val) => val as Specialty),
    query: z
      .string()
      .describe("The clinical question or patient concern to analyze"),
    context: z
      .string()
      .optional()
      .describe(
        "Relevant patient context: age, sex, medical history, medications, allergies, prior findings",
      ),
  }),

  execute: async function* ({ specialty, query, context }, { abortSignal }) {
    const specialtyLabel = SPECIALTY_META[specialty].label;

    // Send progress indicator
    yield {
      type: "progress" as const,
      status: "consulting",
      specialty: specialtyLabel,
    };

    const prompt = context
      ? `Patient Context:\n${context}\n\nClinical Query:\n${query}`
      : `Clinical Query:\n${query}`;

    const result = await getSpecialistAgent(specialty).stream({
      messages: [{ role: "user", content: prompt }],
      abortSignal,
      experimental_transform: smoothStream(),
    });

    // Stream accumulated UI messages from specialist
    for await (const message of readUIMessageStream({
      stream: result.toUIMessageStream(),
    })) {
      yield message;
    }

    // Send completion indicator
    yield {
      type: "progress" as const,
      status: "complete",
      specialty: specialtyLabel,
    };
  },

  // What the router sees: only the final text output.
  // This keeps the router's context window clean regardless of how
  // much detail the specialist produces for the UI.
  toModelOutput: ({ output: message }) => {
    const text = typeof message === "string" ? message : String(message || "");
    return {
      type: "text",
      value: text,
    };
  },
});
