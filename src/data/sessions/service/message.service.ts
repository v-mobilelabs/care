import { sessionRepository } from "../repositories/session.repository";
import { messageRepository } from "../repositories/message.repository";
import type {
  MessageDto,
  PaginatedMessages,
  AddMessageInput,
  ListMessagesInput,
} from "../models/message.model";

// ── Service ───────────────────────────────────────────────────────────────────

export class MessageService {
  /**
   * Add a message to a session and atomically bump the session's
   * `messageCount` and `updatedAt` fields.
   * When usage is present (assistant messages), also accumulates totalUsage.
   */
  async add(input: AddMessageInput): Promise<MessageDto> {
    const { userId, profileId, sessionId } = input;

    const writes: Promise<unknown>[] = [
      messageRepository.add(userId, profileId, sessionId, {
        role: input.role,
        content: input.content,
        usage: input.usage,
        agentType: input.agentType,
      }),
      sessionRepository.incrementMessageCount(userId, profileId, sessionId),
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

/** Singleton — import this throughout the application. */
export const messageService = new MessageService();
