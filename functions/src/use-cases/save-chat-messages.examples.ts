/**
 * KB Context Configuration & Examples
 * Shows how to use the KB context message persistence layer
 */

import type { UIMessage } from "ai";
import {
  saveChatMessagesToKB,
  saveChatMessageToKB,
} from "@/use-cases/save-chat-messages.use-case.js";
import { getKBContextService } from "@/services/chat/kb-context.service.js";

/**
 * Example 1: Save all messages from a conversation
 */
export async function example_saveBatchMessages() {
  const messages = [
    {
      id: "msg-1",
      role: "user",
      content: "What are my current medications?",
    },
    {
      id: "msg-2",
      role: "assistant",
      content: "Based on your health records, you are taking: Metformin...",
    },
  ] as unknown as UIMessage[];

  const result = await saveChatMessagesToKB({
    userId: "user-123",
    contextId: "session-456",
    messages,
    includeMetadata: true,
  });

  console.log(`Saved ${result.saved} messages to KB`);
  console.log(`Failed: ${result.failed}`);
  console.log(`Document IDs: ${result.documentIds}`);
}

/**
 * Example 2: Save individual messages
 */
export async function example_saveSingleMessage() {
  const message = {
    id: "msg-789",
    role: "assistant",
    content: "Your diagnosis shows Type 2 Diabetes...",
  } as unknown as UIMessage;

  const documentId = await saveChatMessageToKB(
    "user-123",
    "session-456",
    message,
    true,
  );

  console.log(`Message saved with KB document ID: ${documentId}`);
}

/**
 * Example 3: Using KB Context Service directly
 */
export async function example_useKBContextService() {
  const service = getKBContextService({
    apiKey: process.env.KB_API_KEY,
    baseURL: process.env.KB_BASE_URL,
  });

  // Ensure context exists
  const contextId = await service.ensureContext("session-456", {
    name: "Patient Chat Session",
    description: "Healthcare assistant chat session",
  });

  console.log(`Context ID: ${contextId}`);

  // Add a message
  const documentId = await service.addMessage("session-456", {
    role: "user",
    parts: [{ type: "text", content: "I have a headache" }],
    metadata: { userId: "user-123", timestamp: new Date().toISOString() },
  });

  console.log(`Message added with ID: ${documentId}`);

  // Get all messages
  const messages = await service.getMessages("session-456");
  console.log(`Retrieved ${messages.documents.items.length} messages`);
}

/**
 * Example 4: Configuration for KB API authentication
 */
export const kbConfig = {
  // Set API key via environment variable
  apiKey: process.env.KB_API_KEY || "your-api-key",

  // Use custom KB instance URL
  baseURL: process.env.KB_BASE_URL || "https://kb.cosmoops.com",

  // Request timeout (ms)
  timeout: 30000,
};

/**
 * Example 5: Error handling
 */
export async function example_errorHandling() {
  try {
    const result = await saveChatMessagesToKB({
      userId: "user-123",
      contextId: "session-456",
      messages: [], // Empty messages
    });

    if (result.failed > 0) {
      console.warn(`Failed to save ${result.failed} messages:`);
      result.errors.forEach((err) => {
        console.warn(`  Index ${err.index}: ${err.error}`);
      });
    }
  } catch (error) {
    // Persistence errors are non-blocking (use case returns failure result)
    console.error("Failed to persist messages:", error);
  }
}
