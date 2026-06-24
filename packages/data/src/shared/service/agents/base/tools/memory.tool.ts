/**
 * Memory Tool — Server-side tool for cross-session patient memory.
 *
 * Allows the AI agent to save, recall, and delete long-term patient facts
 * (medical history, preferences, lifestyle, allergies, summaries).
 * Built fresh per request with a closure over userId/profileId/sessionId.
 */

import { tool, zodSchema } from "ai";
import { z } from "zod";
import {
  SaveMemoryUseCase,
  RecallMemoriesUseCase,
  DeleteMemoryUseCase,
} from "@/data/memory";

const CATEGORY_OPTIONS = [
  "medical",
  "preference",
  "lifestyle",
  "allergy",
  "summary",
] as const;

const MemoryInputSchema = z.object({
  action: z
    .enum(["save", "recall", "delete"])
    .describe("The memory operation to perform"),
  category: z
    .enum(CATEGORY_OPTIONS)
    .optional()
    .describe(
      "Memory category — required for 'save', optional filter for 'recall'",
    ),
  content: z
    .string()
    .max(500)
    .optional()
    .describe("The fact to store — required for 'save' (max 500 chars)"),
  memoryId: z
    .string()
    .optional()
    .describe("The ID of the memory to delete — required for 'delete'"),
});

type MemoryInput = z.infer<typeof MemoryInputSchema>;

export function createMemoryTool(
  userId: string,
  profileId: string,
  sessionId: string,
) {
  return tool({
    description:
      "Save, recall, or delete long-term patient memories that persist across chat sessions. " +
      "Use 'save' to store important facts the patient shares (conditions, allergies, preferences). " +
      "Use 'recall' to retrieve previously saved facts before answering questions about the patient. " +
      "Use 'delete' to remove a specific memory by its ID when it is outdated or incorrect.",
    inputSchema: zodSchema(MemoryInputSchema),
    async execute(input) {
      const { action, category, content, memoryId } = input as MemoryInput;
      if (action === "save") {
        if (!category || !content) {
          return { error: "category and content are required for save" };
        }
        const memory = await new SaveMemoryUseCase().execute({
          userId,
          profileId,
          category,
          content,
          sessionId,
        });
        return { saved: memory };
      }

      if (action === "recall") {
        const memories = await new RecallMemoriesUseCase().execute({
          userId,
          profileId,
          category,
        });
        return { memories };
      }

      if (action === "delete") {
        if (!memoryId) {
          return { error: "memoryId is required for delete" };
        }
        await new DeleteMemoryUseCase().execute({
          userId,
          profileId,
          memoryId,
        });
        return { deleted: memoryId };
      }

      return { error: "Unknown action" };
    },
  });
}
