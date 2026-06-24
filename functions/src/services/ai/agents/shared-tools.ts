/**
 * Shared Tools for All Agents
 * These tools are available to every agent (router, specialists, etc.)
 */

import { createMemoryTool } from "@/services/ai/memory/index.js";
import type { Tool } from "ai";

/**
 * Build shared tools for an agent context
 * Memory tool is context-specific (per user/session)
 *
 * @param contextId - Unique identifier for memory context (userId, sessionId, etc.)
 * @returns Object containing all shared tools
 */
export function buildSharedTools(contextId: string): Record<string, Tool> {
  return {
    /**
     * Memory tool for saving and retrieving agent memories
     * Available to all agents for persistent state management
     */
    memory: createMemoryTool(contextId),

    // Future shared tools:
    // search_medical_knowledge: createSearchTool(),
    // lookup_drug_interactions: createDrugLookupTool(),
    // calculate_dosage: createDosageCalculatorTool(),
  };
}
