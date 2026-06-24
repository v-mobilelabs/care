/**
 * KB Memory Store Adapter
 * Provides unified interface for KB-backed storage
 */

import { getKBMemoryStore, type MemoryItem } from "./kb-memory.store";
import type { KnowledgeBaseClient } from "@/services/kb";

export interface MemoryStoreAdapter {
  /**
   * View a memory item by ID, or all items if ID not provided
   */
  view(
    contextId: string,
    id?: string,
    limit?: number,
  ): Promise<MemoryItem | MemoryItem[] | null>;

  /**
   * Create a new memory item
   */
  create(
    contextId: string,
    title: string,
    content: string,
    tags?: string[],
  ): Promise<MemoryItem>;

  /**
   * Update an existing memory item
   */
  update(
    contextId: string,
    id: string,
    updates: {
      title?: string;
      content?: string;
      tags?: string[];
    },
  ): Promise<MemoryItem | null>;

  /**
   * Search memory items
   */
  search(contextId: string, query: string, limit?: number): Promise<MemoryItem[]>;
}

/**
 * KB-backed store adapter
 */
class KBStoreAdapter implements MemoryStoreAdapter {
  constructor(private kbClient: KnowledgeBaseClient) {}

  async view(
    contextId: string,
    id?: string,
    limit?: number,
  ): Promise<MemoryItem | MemoryItem[] | null> {
    const store = getKBMemoryStore(this.kbClient);

    if (id) {
      return await store.view(contextId, id);
    }

    const items = await store.list(contextId);
    return items.slice(0, limit || 10);
  }

  async create(
    contextId: string,
    title: string,
    content: string,
    tags?: string[],
  ): Promise<MemoryItem> {
    const store = getKBMemoryStore(this.kbClient);
    return await store.create(contextId, {
      title,
      content,
      tags,
    });
  }

  async update(
    contextId: string,
    id: string,
    updates: {
      title?: string;
      content?: string;
      tags?: string[];
    },
  ): Promise<MemoryItem | null> {
    const store = getKBMemoryStore(this.kbClient);
    return await store.update(contextId, id, updates);
  }

  async search(
    contextId: string,
    query: string,
    limit?: number,
  ): Promise<MemoryItem[]> {
    const store = getKBMemoryStore(this.kbClient);
    return await store.search(contextId, {
      query,
      limit: limit || 10,
    });
  }
}

/**
 * Memory store factory - creates KB-backed adapter
 * @param kbClient - KB client for API access
 * @returns MemoryStoreAdapter for KB storage
 */
export function createMemoryStoreAdapter(
  kbClient: KnowledgeBaseClient,
): MemoryStoreAdapter {
  return new KBStoreAdapter(kbClient);
}

// Global store adapter instance (cached)
let globalStoreAdapter: MemoryStoreAdapter | null = null;

/**
 * Initialize the global memory store adapter
 * Should be called once at application startup
 *
 * @param kbClient - KB client instance
 */
export function initializeMemoryStore(
  kbClient: KnowledgeBaseClient,
): void {
  globalStoreAdapter = createMemoryStoreAdapter(kbClient);
}

/**
 * Get the global memory store adapter
 * Requires initializeMemoryStore to be called first
 */
export function getMemoryStoreAdapter(): MemoryStoreAdapter {
  if (!globalStoreAdapter) {
    throw new Error(
      "[Memory] Store not initialized. Call initializeMemoryStore(kbClient) at startup.",
    );
  }

  return globalStoreAdapter;
}
