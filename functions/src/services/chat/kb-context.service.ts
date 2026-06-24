/**
 * KB Context Service
 * Manages persistence of chat messages to KB as context documents
 */

import { createKnowledgeBaseClient } from "@/services/kb/factory.js";
import type { AddContextDocumentRequest } from "@/services/kb/types.js";
import { logger } from "@/lib/logger.js";

export interface KBContextServiceConfig {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
  cacheMaxSize?: number; // Max context IDs to cache in memory (default: 1000)
}

export interface SaveMessagesResult {
  saved: number;
  failed: number;
  errors: Array<{ index: number; error: string }>;
  documentIds: string[];
}

/**
 * Service for managing chat message persistence to KB
 * Uses KB API to store messages as context documents for auditability and retrieval
 */
export class KBContextService {
  private client: ReturnType<typeof createKnowledgeBaseClient>;
  private contextIds: Map<string, string> = new Map();
  private cacheMaxSize: number = 1000; // Default max cached context IDs

  constructor(config?: KBContextServiceConfig) {
    // Use factory function which reads KB_API_KEY from environment
    this.client = createKnowledgeBaseClient({
      apiKey: config?.apiKey,
      baseURL: config?.baseURL,
      timeout: config?.timeout || 30000,
    });

    // Set cache size limit
    if (config?.cacheMaxSize && config.cacheMaxSize > 0) {
      this.cacheMaxSize = config.cacheMaxSize;
    }
  }

  /**
   * Evict oldest entry from cache if at max size
   * Uses simple FIFO approach since Map maintains insertion order
   */
  private evictCacheIfNeeded(): void {
    if (this.contextIds.size >= this.cacheMaxSize) {
      // Remove oldest entry (first one in insertion order)
      const firstKey = this.contextIds.keys().next().value;
      if (firstKey) {
        this.contextIds.delete(firstKey);
        logger.debug("[KB Context Service] Cache evicted", {
          removedContextId: firstKey,
          cacheSize: this.contextIds.size,
        });
      }
    }
  }

  /**
   * Ensure a context exists for a given conversation
   * Creates one if it doesn't exist, caches ID locally (with bounded cache size)
   */
  async ensureContext(
    contextId: string,
    options?: { name?: string; description?: string },
  ): Promise<string> {
    // Check cache first
    if (this.contextIds.has(contextId)) {
      return this.contextIds.get(contextId)!;
    }

    try {
      const response = await this.client.createContext({
        name: options?.name || `Chat Context: ${contextId}`,
        description:
          options?.description ||
          `Function API chat messages for context ${contextId}`,
        windowSize: 100, // Keep last 100 messages
      });

      const kbContextId = response.context.id;
      
      // Evict oldest entry if cache is full
      this.evictCacheIfNeeded();
      
      this.contextIds.set(contextId, kbContextId);

      logger.info("[KB Context Service] Context created", {
        contextId,
        kbContextId,
        cacheSize: this.contextIds.size,
      });

      return kbContextId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isAuthError = errorMessage.includes("401") || errorMessage.includes("Unauthorized") || errorMessage.includes("forbidden");
      const isMissingKeyError = !process.env.KB_API_KEY;
      
      logger.error("[KB Context Service] Failed to create context", {
        contextId,
        errorMessage,
        isAuthError,
        isMissingKeyError,
        hasApiKey: !!process.env.KB_API_KEY,
        kbBaseUrl: process.env.KB_BASE_URL || "https://kb.cosmoops.com",
      });
      throw error;
    }
  }

  /**
   * Add a single message document to the context
   */
  async addMessage(
    contextId: string,
    document: AddContextDocumentRequest,
  ): Promise<string> {
    try {
      const kbContextId = await this.ensureContext(contextId);
      const response = await this.client.addContextDocument(
        kbContextId,
        document,
      );

      logger.info("[KB Context Service] Message added", {
        contextId,
        documentId: response.document.id,
      });

      return response.document.id;
    } catch (error) {
      logger.error("[KB Context Service] Failed to add message", {
        contextId,
        error,
      });
      throw error;
    }
  }

  /**
   * Add multiple message documents in batch
   */
  async addMessages(
    contextId: string,
    documents: AddContextDocumentRequest[],
  ): Promise<SaveMessagesResult> {
    const result: SaveMessagesResult = {
      saved: 0,
      failed: 0,
      errors: [],
      documentIds: [],
    };

    try {
      const kbContextId = await this.ensureContext(contextId);

      // Process documents sequentially to maintain order
      for (let i = 0; i < documents.length; i++) {
        try {
          const response = await this.client.addContextDocument(
            kbContextId,
            documents[i],
          );

          result.saved++;
          result.documentIds.push(response.document.id);

          logger.info("[KB Context Service] Message added", {
            contextId,
            index: i,
            documentId: response.document.id,
          });
        } catch (error) {
          result.failed++;
          result.errors.push({
            index: i,
            error: error instanceof Error ? error.message : String(error),
          });

          logger.error("[KB Context Service] Failed to add message at index", {
            contextId,
            index: i,
            error,
          });
        }
      }

      logger.info("[KB Context Service] Batch add complete", {
        contextId,
        saved: result.saved,
        failed: result.failed,
      });

      return result;
    } catch (error) {
      logger.error("[KB Context Service] Batch operation failed", {
        contextId,
        error,
      });
      throw error;
    }
  }

  /**
   * Get all messages for a context
   */
  async getMessages(contextId: string) {
    try {
      const kbContextId = await this.ensureContext(contextId);
      return await this.client.getContextDocuments(kbContextId);
    } catch (error) {
      logger.error("[KB Context Service] Failed to get messages", {
        contextId,
        error,
      });
      throw error;
    }
  }

  /**
   * Set API key for authentication
   */
  setApiKey(apiKey: string): void {
    this.client.setApiKey(apiKey);
  }

  /**
   * Set user token for authentication
   */
  setUserToken(userToken: string): void {
    this.client.setUserToken(userToken);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.contextIds.size,
      maxSize: this.cacheMaxSize,
      utilization: `${Math.round((this.contextIds.size / this.cacheMaxSize) * 100)}%`,
    };
  }

  /**
   * Clear all cached context IDs (useful for testing or cleanup)
   */
  clearCache(): void {
    const previousSize = this.contextIds.size;
    this.contextIds.clear();
    logger.debug("[KB Context Service] Cache cleared", {
      previousSize,
      newSize: this.contextIds.size,
    });
  }
}

/**
 * Lazy singleton instance
 */
let instance: KBContextService | null = null;

/**
 * Get or create KB context service singleton
 */
export function getKBContextService(
  config?: KBContextServiceConfig,
): KBContextService {
  if (!instance) {
    instance = new KBContextService(config);
  }
  return instance;
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetKBContextService(): void {
  instance = null;
}
