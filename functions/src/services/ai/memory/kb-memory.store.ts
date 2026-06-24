/**
 * KB-backed Memory Store Implementation
 * Stores agent memory documents in KB API instead of in-memory
 */

import { KnowledgeBaseClient } from "@/services/kb";
import type { MemoryDocument as KBMemoryDocument } from "@/services/kb/types";

export interface MemoryItem {
  id: string;
  title: string;
  content: unknown;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MemorySearchOptions {
  query?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Maps agent memory items to KB memory documents and vice versa
 */
class MemoryItemMapper {
  static toKBDocument(item: MemoryItem): {
    title: string;
    content: string;
  } {
    const tagsStr = item.tags?.length ? `[TAGS: ${item.tags.join(",")}]` : "";
    const content = {
      id: item.id,
      title: item.title,
      content: item.content,
      tags: item.tags || [],
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };

    return {
      title: item.title,
      content: `${tagsStr}\n\n${JSON.stringify(content)}`,
    };
  }

  static fromKBDocument(doc: KBMemoryDocument): MemoryItem {
    try {
      // Parse the JSON content (skip tags line if present)
      const contentStr = doc.content.includes("\n\n")
        ? doc.content.split("\n\n")[1]
        : doc.content;
      const parsed = JSON.parse(contentStr);

      return {
        id: parsed.id || doc.id,
        title: parsed.title || doc.title,
        content: parsed.content,
        tags: parsed.tags || [],
        createdAt: new Date(parsed.createdAt || doc.createdAt),
        updatedAt: new Date(parsed.updatedAt || doc.updatedAt),
      };
    } catch {
      // Fallback: treat the entire document as content
      return {
        id: doc.id,
        title: doc.title,
        content: doc.content,
        tags: [],
        createdAt: new Date(doc.createdAt),
        updatedAt: new Date(doc.updatedAt),
      };
    }
  }
}

/**
 * KB-backed memory store for agent context
 * Each contextId maps to a KB memory, storing items as memory documents
 */
export class KBMemoryStore {
  private readonly kbClient: KnowledgeBaseClient;
  private readonly contextIdToMemoryIdMap: Map<string, string> = new Map();

  constructor(kbClient: KnowledgeBaseClient) {
    this.kbClient = kbClient;
  }

  /**
   * Get or create a KB memory for the context
   */
  private async getOrCreateMemoryId(
    contextId: string,
  ): Promise<string> {
    // Check cache first
    if (this.contextIdToMemoryIdMap.has(contextId)) {
      return this.contextIdToMemoryIdMap.get(contextId)!;
    }

    // Create new memory for this context
    const response = await this.kbClient.createMemory({
      description: `Agent memory for context: ${contextId}`,
      documentCapacity: 1000, // Allow many documents
      condenseThresholdPercent: 80, // Auto-condense at 80% capacity
    });

    const memoryId = response.memory.id;
    this.contextIdToMemoryIdMap.set(contextId, memoryId);

    return memoryId;
  }

  /**
   * View a single memory item
   */
  async view(
    contextId: string,
    itemId: string,
  ): Promise<MemoryItem | null> {
    try {
      const memoryId = await this.getOrCreateMemoryId(contextId);
      const response = await this.kbClient.getMemoryDocuments(memoryId);
      const doc = response.items.find((d) => d.id === itemId);

      return doc ? MemoryItemMapper.fromKBDocument(doc) : null;
    } catch (error) {
      console.error(
        `[KBMemoryStore] Failed to view item ${itemId} in context ${contextId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Create a new memory item
   */
  async create(
    contextId: string,
    item: Omit<MemoryItem, "id" | "createdAt" | "updatedAt">,
  ): Promise<MemoryItem> {
    try {
      const memoryId = await this.getOrCreateMemoryId(contextId);
      const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date();

      const fullItem: MemoryItem = {
        id: itemId,
        ...item,
        createdAt: now,
        updatedAt: now,
      };

      const { title, content } =
        MemoryItemMapper.toKBDocument(fullItem);

      await this.kbClient.addMemoryDocument(memoryId, {
        title,
        content,
      });

      return fullItem;
    } catch (error) {
      console.error(
        `[KBMemoryStore] Failed to create item in context ${contextId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update an existing memory item
   */
  async update(
    contextId: string,
    itemId: string,
    updates: Partial<Omit<MemoryItem, "id" | "createdAt">>,
  ): Promise<MemoryItem | null> {
    try {
      const existingItem = await this.view(contextId, itemId);

      if (!existingItem) {
        console.warn(
          `[KBMemoryStore] Item ${itemId} not found in context ${contextId}`,
        );
        return null;
      }

      const updated: MemoryItem = {
        ...existingItem,
        ...updates,
        id: existingItem.id,
        createdAt: existingItem.createdAt,
        updatedAt: new Date(),
      };

      const memoryId = await this.getOrCreateMemoryId(contextId);
      const { title, content } =
        MemoryItemMapper.toKBDocument(updated);

      // KB doesn't support direct document updates, so we add a new document
      // with the same ID (marked as update via metadata)
      await this.kbClient.addMemoryDocument(memoryId, {
        title: `${title} [UPDATED]`,
        content,
      });

      return updated;
    } catch (error) {
      console.error(
        `[KBMemoryStore] Failed to update item ${itemId} in context ${contextId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Search memory items
   */
  async search(
    contextId: string,
    options: MemorySearchOptions = {},
  ): Promise<MemoryItem[]> {
    try {
      const memoryId = await this.getOrCreateMemoryId(contextId);
      const response = await this.kbClient.getMemoryDocuments(memoryId);

      let results = response.items.map((doc) =>
        MemoryItemMapper.fromKBDocument(doc),
      );

      // Filter by query (search title and content)
      if (options.query) {
        const q = options.query.toLowerCase();
        results = results.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            (typeof item.content === "string" &&
              item.content.toLowerCase().includes(q)) ||
            JSON.stringify(item.content).toLowerCase().includes(q),
        );
      }

      // Filter by tags
      if (options.tags && options.tags.length > 0) {
        results = results.filter((item) =>
          options.tags!.some((tag) =>
            (item.tags || []).includes(tag),
          ),
        );
      }

      // Pagination
      const offset = options.offset || 0;
      const limit = options.limit || 100;

      return results.slice(offset, offset + limit);
    } catch (error) {
      console.error(
        `[KBMemoryStore] Failed to search items in context ${contextId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * List all items in a context memory
   */
  async list(contextId: string): Promise<MemoryItem[]> {
    try {
      const memoryId = await this.getOrCreateMemoryId(contextId);
      const response = await this.kbClient.getMemoryDocuments(memoryId);

      return response.items.map((doc) =>
        MemoryItemMapper.fromKBDocument(doc),
      );
    } catch (error) {
      console.error(
        `[KBMemoryStore] Failed to list items in context ${contextId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Delete a memory item (by creating a deletion marker)
   */
  async delete(contextId: string, itemId: string): Promise<boolean> {
    try {
      const memoryId = await this.getOrCreateMemoryId(contextId);

      // Create a deletion marker
      await this.kbClient.addMemoryDocument(memoryId, {
        title: `Deleted: ${itemId}`,
        content: JSON.stringify({
          id: itemId,
          deleted: true,
          deletedAt: new Date().toISOString(),
        }),
      });

      return true;
    } catch (error) {
      console.error(
        `[KBMemoryStore] Failed to delete item ${itemId} in context ${contextId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Clear all memory for a context (utility for cleanup)
   */
  async clearContext(contextId: string): Promise<void> {
    try {
      // Remove from cache
      this.contextIdToMemoryIdMap.delete(contextId);

      // Note: KB API doesn't support deleting entire memory,
      // so we just clear our local mapping. The KB memory persists.
      console.log(
        `[KBMemoryStore] Cleared context mapping for ${contextId}`,
      );
    } catch (error) {
      console.error(
        `[KBMemoryStore] Failed to clear context ${contextId}:`,
        error,
      );
    }
  }
}

// Global store instances per KB client
const storeMap = new Map<KnowledgeBaseClient, KBMemoryStore>();

/**
 * Get or create KB memory store for a client
 */
export function getKBMemoryStore(
  kbClient: KnowledgeBaseClient,
): KBMemoryStore {
  if (!storeMap.has(kbClient)) {
    storeMap.set(kbClient, new KBMemoryStore(kbClient));
  }

  return storeMap.get(kbClient)!;
}

/**
 * Clear all KB memory store instances
 */
export function clearKBMemoryStores(): void {
  storeMap.clear();
}
