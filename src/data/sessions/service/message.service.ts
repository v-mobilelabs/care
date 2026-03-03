import { sessionRepository } from "../repositories/session.repository";
import { messageRepository } from "../repositories/message.repository";
import type { MessageDto } from "../models/message.model";
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
    const { userId, sessionId } = input;

    const [message] = await Promise.all([
      messageRepository.add(userId, sessionId, {
        role: input.role,
        content: input.content,
      }),
      sessionRepository.incrementMessageCount(userId, sessionId),
    ]);

    return message;
  }

  async list(input: ListMessagesInput): Promise<MessageDto[]> {
    return messageRepository.list(input.userId, input.sessionId, input.limit);
  }
}

/** Singleton — import this throughout the application. */
export const messageService = new MessageService();
