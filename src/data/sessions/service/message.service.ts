import { sessionRepository } from "../repositories/session.repository";
import { messageRepository } from "../repositories/message.repository";
import type { MessageDto, PaginatedMessages } from "../models/message.model";
import type {
  AddMessageInput,
  ListMessagesInput,
} from "../models/message.model";

// ── Service ───────────────────────────────────────────────────────────────────

export class MessageService {
  /**
   * Add a message to a session and atomically bump the session's
   * `messageCount` and `updatedAt` fields.
   */
  async add(input: AddMessageInput): Promise<MessageDto> {
    const { userId, profileId, sessionId } = input;

    const [message] = await Promise.all([
      messageRepository.add(userId, profileId, sessionId, {
        role: input.role,
        content: input.content,
        usage: input.usage,
      }),
      sessionRepository.incrementMessageCount(userId, profileId, sessionId),
    ]);

    return message;
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

/** Singleton — import this throughout the application. */
export const messageService = new MessageService();
