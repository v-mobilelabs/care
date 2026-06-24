/**
 * Memory Tool for Agents
 * Custom tool implementing structured memory operations
 * Following AI SDK Memory Custom Tool guidelines
 *
 * Uses KB-backed storage for persistent memory
 */

import { tool } from "ai";
import { z } from "zod";
import { getMemoryStoreAdapter } from "./memory-store.factory";
import type { MemoryInput, MemoryResult, MemoryAction, ToolInput } from "./memory.types";
import type { MemoryItem } from "./kb-memory.store";

/**
 * Create a memory tool for an agent
 * The tool provides structured operations for managing agent memory:
 * - view: retrieve documents
 * - create: add new memory
 * - update: modify existing memory
 * - search: find relevant memories
 *
 * @param contextId - Unique identifier for the memory context (user ID, session ID, etc.)
 */
export function createMemoryTool(contextId: string) {
  const storeAdapter = getMemoryStoreAdapter();

  return tool({
    description:
      "Structured memory tool for saving, retrieving, and searching agent memories. " +
      "Use this to retain information across conversation turns.",
    inputSchema: z.object({
      action: z
        .enum(["view", "create", "update", "search"])
        .describe("Memory operation: view, create, update, or search"),
      id: z
        .string()
        .optional()
        .describe("Document ID (for view or update operations)"),
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Maximum number of results to return (default: 10)"),
      title: z
        .string()
        .max(200)
        .optional()
        .describe("Document title (for create or update operations)"),
      content: z
        .string()
        .max(10000)
        .optional()
        .describe("Document content (for create or update operations)"),
      tags: z
        .array(z.string())
        .optional()
        .describe("Tags for categorization (for create or update operations)"),
      query: z
        .string()
        .optional()
        .describe("Search query (for search operations)"),
    }) as any,
    execute: async (input: ToolInput): Promise<MemoryResult> => {
      const action = input.action;
      try {
        switch (input.action) {
          case "view": {
            const { id, limit } = input as Extract<MemoryInput, { action: "view" }>;
            const result = await storeAdapter.view(contextId, id, limit || 10);

            if (id && result === null) {
              return {
                success: false,
                action: "view",
                error: `Memory with ID ${id} not found`,
              };
            }

            const docs: MemoryItem[] = Array.isArray(result)
              ? result
              : result
                ? [result]
                : [];
            return {
              success: true,
              action: "view",
              data: docs,
              message: id
                ? `Retrieved memory: ${docs[0]?.title}`
                : `Retrieved ${docs.length} memories`,
            };
          }

          case "create": {
            const { title, content, tags } = input as Extract<MemoryInput, { action: "create" }>;
            const doc = await storeAdapter.create(
              contextId,
              title,
              content,
              tags,
            );

            return {
              success: true,
              action: "create",
              data: doc,
              message: `Memory created: ${title}`,
            };
          }

          case "update": {
            const { id, title, content, tags } = input as Extract<MemoryInput, { action: "update" }>;

            // Validate that at least one field is being updated
            if (!title && !content && !tags) {
              return {
                success: false,
                action: "update",
                error: "At least one field (title, content, or tags) must be provided for update",
              };
            }

            const updated = await storeAdapter.update(contextId, id, {
              title,
              content,
              tags,
            });

            if (!updated) {
              return {
                success: false,
                action: "update",
                error: `Memory with ID ${id} not found`,
              };
            }

            return {
              success: true,
              action: "update",
              data: updated,
              message: `Memory updated: ${updated.title}`,
            };
          }

          case "search": {
            const { query, limit } = input as Extract<MemoryInput, { action: "search" }>;
            const results = await storeAdapter.search(
              contextId,
              query,
              limit || 10,
            );

            return {
              success: true,
              action: "search",
              data: results,
              message: `Found ${results.length} memories matching "${query}"`,
            };
          }

          default: {
            return {
              success: false,
              action: action as MemoryAction,
              error: `Unknown action: ${action}`,
            };
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          success: false,
          action: action as MemoryAction,
          error: `Memory operation failed: ${errorMessage}`,
        };
      }
    },
  });
}
