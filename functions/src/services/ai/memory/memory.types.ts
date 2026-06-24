/**
 * Memory Tool Types
 * Structured operations for agent memory management
 */

import type { MemoryItem } from "./kb-memory.store";

/**
 * Memory action types for structured operations
 */
export type MemoryAction = "view" | "create" | "update" | "search";

/**
 * Base memory operation input
 */
export interface MemoryOperationInput {
  action: MemoryAction;
}

/**
 * View memory document(s)
 */
export interface MemoryViewInput extends MemoryOperationInput {
  action: "view";
  id?: string; // If provided, return specific document; if not, return all
  limit?: number; // Max documents to return (default: 10)
}

/**
 * Create new memory document
 */
export interface MemoryCreateInput extends MemoryOperationInput {
  action: "create";
  title: string;
  content: string;
  tags?: string[];
}

/**
 * Update existing memory document
 */
export interface MemoryUpdateInput extends MemoryOperationInput {
  action: "update";
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
}

/**
 * Search memory documents
 */
export interface MemorySearchInput extends MemoryOperationInput {
  action: "search";
  query: string; // Search in title, content, and tags
  limit?: number; // Max results (default: 10)
}

/**
 * Union of all memory operation inputs
 */
export type MemoryInput =
  | MemoryViewInput
  | MemoryCreateInput
  | MemoryUpdateInput
  | MemorySearchInput;

/**
 * Tool input schema for Vertex AI (flat object for function calling)
 * All fields are optional, validation happens in execute function
 */
export interface ToolInput {
  action: MemoryAction;
  id?: string;
  limit?: number;
  title?: string;
  content?: string;
  tags?: string[];
  query?: string;
}

/**
 * Memory operation result
 */
export interface MemoryResult {
  success: boolean;
  action: MemoryAction;
  data?: MemoryItem | MemoryItem[] | null;
  message?: string;
  error?: string;
}
