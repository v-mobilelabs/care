/**
 * General Medicine Subagent Tool
 * Delegates medical queries to the specialized general medicine agent
 */

import { tool, readUIMessageStream } from "ai";
import { z } from "zod";
import { getGeneralMedicineSubagent } from "../general-medicine.agent.js";

/**
 * Tool that invokes the General Medicine Subagent
 *
 * Allows the router to delegate medical queries to a specialized agent
 * while maintaining context efficiency through summarization.
 * Uses async generator + readUIMessageStream for immediate chunk delivery.
 */
export const generalMedicineTool = tool({
  description:
    "Delegate to the General Medicine specialist agent for symptoms, diagnoses, treatments, and general medical advice",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "The medical query or patient concern to analyze with general medicine expertise",
      ),
    context: z
      .string()
      .optional()
      .describe(
        "Additional context like patient demographics, medical history, or previous findings",
      ),
  }),
  execute: async function* ({ query, context }, { abortSignal }) {
    // Build the subagent prompt (fresh conversation, isolated from main agent)
    const subagentPrompt = context
      ? `${context}\n\nQuery: ${query}`
      : `Query: ${query}`;

    // Start the subagent — stream() returns immediately with a lazy stream,
    // so we don't block here waiting for the agent to finish.
    const result = getGeneralMedicineSubagent().stream({
      messages: [{ role: "user", content: subagentPrompt }],
      abortSignal,
    });

    // readUIMessageStream emits a growing UIMessage on every incoming chunk,
    // so the UI receives tokens as soon as they arrive from the subagent.
    for await (const message of readUIMessageStream({
      stream: (await result).toUIMessageStream(),
    })) {
      yield message;
    }
  },
  // Control what the main (router) agent sees: just the final text summary,
  // keeping its context window clean while the UI sees everything.
  toModelOutput: ({ output: message }) => {
    const lastText = (message?.parts ?? [])
      .slice()
      .reverse()
      .find((p) => p.type === "text") as { text: string } | undefined;

    return {
      type: "text",
      value: lastText?.text ?? "Medical query processed.",
    };
  },
});
