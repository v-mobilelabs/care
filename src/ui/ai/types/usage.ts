import { z } from "zod";

/**
 * Schema for `data-usage` stream parts sent from the chat API route
 * to the client after the agent stream finishes (final token usage).
 *
 * Server: `writer.write({ type: "data-usage", data: { inputTokens, outputTokens } })`
 * Client: `dataPartSchemas: { usage: usagePartSchema }` in useChat
 */
export const usagePartSchema = z.object({
  inputTokens: z.number().describe("Total prompt tokens consumed"),
  outputTokens: z.number().describe("Total completion tokens generated"),
});

export type UsageData = z.infer<typeof usagePartSchema>;
