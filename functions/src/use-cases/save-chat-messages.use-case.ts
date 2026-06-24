/**
 * Save Chat Messages to KB Use Case
 * Persists function API chat messages to KB context documents for auditability
 */

import type { UIMessage } from "ai";
import { ChatMessageConverter } from "@/services/chat/message-converter.service.js";
import { getKBContextService } from "@/services/chat/kb-context.service.js";
import type { SaveMessagesResult } from "@/services/chat/kb-context.service.js";
import { logger } from "@/lib/logger.js";

export interface SaveChatMessagesInput {
  userId: string;
  contextId: string;
  messages: UIMessage[];
  includeMetadata?: boolean;
}

/**
 * Use case for persisting chat messages to KB
 */
export async function saveChatMessagesToKB(
  input: SaveChatMessagesInput,
): Promise<SaveMessagesResult> {
  const { userId, contextId, messages, includeMetadata = true } = input;

  try {
    logger.info("[Save Chat Messages] Starting persistence", {
      userId,
      contextId,
      messageCount: messages.length,
    });

    // Convert messages to KB context documents
    const documents = ChatMessageConverter.toContextDocuments(messages, {
      userId,
      contextId,
      includeMetadata,
    });

    if (documents.length === 0) {
      logger.info("[Save Chat Messages] No messages to save", {
        userId,
        contextId,
      });
      return {
        saved: 0,
        failed: 0,
        errors: [],
        documentIds: [],
      };
    }

    // Get KB context service and save documents
    const kbService = getKBContextService();
    const result = await kbService.addMessages(contextId, documents);

    logger.info("[Save Chat Messages] Persistence complete", {
      userId,
      contextId,
      result,
    });

    return result;
  } catch (error) {
    logger.error("[Save Chat Messages] Failed to persist messages", {
      userId,
      contextId,
      error,
    });

    // Return failure result instead of throwing to avoid blocking chat
    return {
      saved: 0,
      failed: messages.length,
      errors: [{ index: 0, error: `Batch failed: ${error}` }],
      documentIds: [],
    };
  }
}

/**
 * Save individual message to KB
 */
export async function saveChatMessageToKB(
  userId: string,
  contextId: string,
  message: UIMessage,
  includeMetadata?: boolean,
): Promise<string | null> {
  try {
    const document = ChatMessageConverter.toContextDocument(message, {
      userId,
      contextId,
      includeMetadata,
    });

    const kbService = getKBContextService();
    const documentId = await kbService.addMessage(contextId, document);

    logger.debug("[Save Chat Message] Individual message saved", {
      userId,
      contextId,
      messageId: message.id,
      documentId,
    });

    return documentId;
  } catch (error) {
    logger.error("[Save Chat Message] Failed to save individual message", {
      userId,
      contextId,
      messageId: message.id,
      error,
    });

    // Return null on error to avoid blocking chat
    return null;
  }
}
