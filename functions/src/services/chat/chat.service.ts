/**
 * Chat Service Integration with Router Agent
 * Integrates router agent with shared tools (memory, etc.)
 * Each chat request gets a context-aware agent with persistent memory
 */

import {
  createRouterAgent,
  ROUTER_AGENT_WELCOME,
} from "@/services/ai/agents/index.js";
import { validateUIMessages, pipeAgentUIStreamToResponse } from "ai";
import type { Response } from "express";
import type { UIMessage } from "ai";
import { logger } from "@/lib/logger.js";
import { saveChatMessagesToKB } from "@/use-cases/save-chat-messages.use-case.js";

/** Chat request structure */
export interface ChatRequest {
  userId: string;
  contextId: string;
  messages: UIMessage[];
}

/** Chat response structure */
export interface ChatResponse {
  userId: string;
  contextId: string;
  message: string;
  timestamp: number;
}

/**
 * Get welcome message for new conversations
 */
export function getWelcomeMessage(): string {
  return ROUTER_AGENT_WELCOME;
}

/**
 * Stream chat response directly to Express HTTP response
 *
 * Pipes the router agent's UI message stream to the client using Server-Sent Events.
 * Agent includes access to shared tools (memory, etc.) scoped to the context.
 *
 * After streaming completes, messages are persisted to KB for auditability.
 *
 * @param req - Chat request with messages and contextId
 * @param res - Express Response object
 * @param abortSignal - Signal to cancel streaming on client disconnect
 * @throws ChatError on validation or streaming errors
 */
export async function streamChatToResponse(
  req: ChatRequest,
  res: Response,
  abortSignal: AbortSignal,
): Promise<void> {
  const { contextId, userId, messages } = req;

  try {
    // Create context-aware agent with shared tools (memory, etc.)
    const agent = createRouterAgent(contextId);

    // Validate messages from client to ensure proper UIMessage format
    const validatedMessages = await validateUIMessages({
      messages,
    });

    // Pass validated UIMessages directly to stream
    await pipeAgentUIStreamToResponse({
      response: res,
      agent,
      uiMessages: validatedMessages,
      abortSignal,
      onFinish: async ({ messages: finalMessages }) => {
        logger.info("[Chat Stream Finished]", {
          contextId,
          messageCount: finalMessages.length,
          withMemory: true,
        });

        // Persist all messages to KB for auditability (non-blocking)
        try {
          const persistResult = await saveChatMessagesToKB({
            userId,
            contextId,
            messages: finalMessages,
            includeMetadata: true,
          });

          logger.info("[Chat Messages Persisted to KB]", {
            userId,
            contextId,
            saved: persistResult.saved,
            failed: persistResult.failed,
          });

          // Log any errors but don't block chat flow
          if (persistResult.errors.length > 0) {
            logger.warn("[Chat Persistence Errors]", {
              userId,
              contextId,
              errors: persistResult.errors,
            });
          }
        } catch (persistError) {
          // Log but don't throw — chat already completed successfully
          logger.error("[Chat Message Persistence Failed]", {
            userId,
            contextId,
            persistError,
          });
        }
      },
    });
  } catch (error) {
    // Client disconnect — no error log needed
    if ((error as { name?: string })?.name === "AbortError") {
      return;
    }
    logger.error("[Stream to Response Error]", {
      contextId: req.contextId,
      error,
    });
    throw error;
  }
}
