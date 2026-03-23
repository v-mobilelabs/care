import { z } from "zod";

/**
 * Schema for `data-error` stream parts sent from the chat API route
 * when the model produces an empty response (0 meaningful output tokens).
 *
 * Server: `writer.write({ type: "data-error", data: { code, message } })`
 * Client: `dataPartSchemas: { error: errorPartSchema }` in useChat
 */
export const errorPartSchema = z.object({
  code: z.string().describe("Machine-readable error code"),
  message: z.string().describe("Human-readable error message"),
});

export type ErrorData = z.infer<typeof errorPartSchema>;
