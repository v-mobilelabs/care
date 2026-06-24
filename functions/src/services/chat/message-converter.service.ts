/**
 * Chat Message Conversion Service
 * Converts AI SDK UIMessages to KB Context Documents for persistence
 */

import type { UIMessage } from "ai";
import type { AddContextDocumentRequest } from "@/services/kb/types.js";

export interface MessageConversionOptions {
  userId: string;
  contextId: string;
  includeMetadata?: boolean;
}

/**
 * Converts AI SDK UIMessage to KB ContextDocument format
 * Flattens message parts and preserves tool information
 */
export class ChatMessageConverter {
  /**
   * Convert a single UI message to KB context document
   */
  static toContextDocument(
    message: UIMessage,
    options: MessageConversionOptions,
  ): AddContextDocumentRequest {
    const { userId, contextId } = options;

    // Map AI SDK role to KB role
    const role = this.mapRole((message as unknown as { role?: string }).role || "user");

    // Extract content from message
    const contentText = this.extractContentText(message);

    // Convert message parts to KB parts format
    const parts = this.convertParts(message);

    // Build metadata
    const metadata = {
      userId,
      contextId,
      messageId: (message as unknown as { id?: string }).id,
      timestamp: new Date().toISOString(),
      ...(options.includeMetadata && { original: message }),
    };

    return {
      role,
      parts: [
        // Text content as first part
        {
          type: "text",
          content: contentText,
        },
        // Add structured parts
        ...parts,
      ],
      metadata,
    };
  }

  /**
   * Convert multiple messages to KB context documents
   */
  static toContextDocuments(
    messages: UIMessage[],
    options: MessageConversionOptions,
  ): AddContextDocumentRequest[] {
    // Filter to keep valid messages: must have id and role from AI SDK
    const validMessages = messages.filter((msg) => {
      const m = msg as unknown as { id?: unknown; role?: unknown };
      return m.id && m.role; // All UIMessages should have these
    });

    // Convert all valid messages to KB documents
    return validMessages.map((msg) => this.toContextDocument(msg, options));
  }

  /**
   * Map AI SDK message role to KB role
   */
  private static mapRole(
    aiRole: string,
  ): "system" | "user" | "assistant" {
    switch (aiRole) {
      case "user":
        return "user";
      case "assistant":
        return "assistant";
      case "system":
        return "system";
      default:
        return "user";
    }
  }

  /**
   * Extract plain text content from message
   */
  private static extractContentText(message: UIMessage): string {
    const m = message as unknown as { content?: string | unknown[] };
    const content = m.content;

    // If content is already a string, use it
    if (typeof content === "string") {
      return content;
    }

    // If content is an array, extract text parts
    if (Array.isArray(content)) {
      const textParts = content
        .filter((part) => typeof part === "object" && part !== null && (part as unknown as { type?: string }).type === "text")
        .map((part) => (part as unknown as { text?: string }).text || "")
        .filter((text) => text.length > 0);
      
      return textParts.join("\n");
    }

    // Return empty string as fallback
    return "";
  }

  /**
   * Convert message parts to KB parts format
   */
  private static convertParts(message: UIMessage): Record<string, unknown>[] {
    const parts: Record<string, unknown>[] = [];
    const m = message as unknown as {
      toolInvocations?: unknown[];
      content?: unknown[];
      usage?: unknown;
    };

    // Process tool invocations
    const toolInvocations = m.toolInvocations;
    if (Array.isArray(toolInvocations) && toolInvocations.length > 0) {
      for (const tool of toolInvocations) {
        const t = tool as unknown as {
          toolName?: string;
          toolCallId?: string;
          args?: unknown;
          result?: unknown;
        };
        parts.push({
          type: "tool-invocation",
          toolName: t.toolName,
          toolCallId: t.toolCallId,
          args: t.args,
          result: t.result,
        });
      }
    }

    // Process content parts if content is an array
    const content = m.content;
    if (Array.isArray(content)) {
      for (const part of content) {
        if (typeof part === "object" && part !== null) {
          const p = part as unknown as { type?: string };
          if (p.type && p.type !== "text") {
            parts.push(p as Record<string, unknown>);
          }
        }
      }
    }

    // Add usage information if available
    if (m.usage) {
      parts.push({
        type: "usage",
        usage: m.usage,
      });
    }

    return parts;
  }
}
