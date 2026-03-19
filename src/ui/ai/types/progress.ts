import { z } from "zod";

/**
 * Schema for `data-progress` stream parts sent from the chat API route
 * to the client during the preparation phase (before the first LLM token).
 *
 * Server: `writer.write({ type: "data-progress", data: { stage, loadingHints } })`
 * Client: `dataPartSchemas: { progress: progressPartSchema }` in useChat
 */
export const progressPartSchema = z.object({
  stage: z.string().describe("Human-readable label for the current step"),
  loadingHints: z
    .array(z.string())
    .optional()
    .describe("Gateway-generated contextual phrases for cycling display"),
});

export type ProgressData = z.infer<typeof progressPartSchema>;
