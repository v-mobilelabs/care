import { sessionRepository } from "../repositories/session.repository";
import { messageRepository } from "../repositories/message.repository";
import type {
  MessageDto,
  PaginatedMessages,
  AddMessageInput,
  ListMessagesInput,
} from "../models/message.model";
import { inferKindFromContent } from "../models/message.model";

// ── Service ───────────────────────────────────────────────────────────────────

export class MessageService {
  /**
   * Add a message to a session and atomically bump the session's
   * `messageCount` and `updatedAt` fields.
   * When usage is present (assistant messages), also accumulates totalUsage.
   * If id is provided, uses that as the Firestore document ID (typically for audio messages).
   */
  async add(input: AddMessageInput): Promise<MessageDto> {
    const { userId, profileId, sessionId } = input;
    const lastMessagePreview = buildMessagePreview(input.content);

    // Infer kind from content if not explicitly provided
    const kind = input.kind ?? inferKindFromContent(input.content);

    const writes: Promise<unknown>[] = [
      messageRepository.add(
        userId,
        profileId,
        sessionId,
        {
          role: input.role,
          kind,
          content: input.content,
          usage: input.usage,
          agentType: input.agentType,
        },
        input.id,
      ),
      sessionRepository.incrementMessageCount(
        userId,
        profileId,
        sessionId,
        lastMessagePreview,
      ),
    ];

    if (input.usage) {
      writes.push(
        sessionRepository.incrementTotalUsage(
          userId,
          profileId,
          sessionId,
          input.usage,
        ),
      );
    }

    const [message] = await Promise.all(writes);

    return message as MessageDto;
  }

  async list(input: ListMessagesInput): Promise<PaginatedMessages> {
    return messageRepository.list(
      input.userId,
      input.profileId,
      input.sessionId,
      input.limit,
      input.cursor,
    );
  }
}

const PREVIEW_MAX_LENGTH = 140;

function buildMessagePreview(content: string): string | undefined {
  const plainFromJson = extractTextFromSerializedParts(content);
  const plainText = normalizePreviewText(plainFromJson ?? content);
  if (!plainText) return undefined;

  if (plainText.length <= PREVIEW_MAX_LENGTH) return plainText;
  return `${plainText.slice(0, PREVIEW_MAX_LENGTH - 1)}…`;
}

function extractTextFromSerializedParts(content: string): string | undefined {
  try {
    const parsed = JSON.parse(content) as Array<Record<string, unknown>>;
    if (!Array.isArray(parsed)) return undefined;

    const textParts = parsed
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => (part.text as string).trim())
      .filter((text) => text.length > 0);

    if (textParts.length === 0) return undefined;
    return textParts.join(" ");
  } catch {
    return undefined;
  }
}

function normalizePreviewText(text: string): string {
  return text.replaceAll(/\s+/g, " ").trim();
}

/** Singleton — import this throughout the application. */
export const messageService = new MessageService();
