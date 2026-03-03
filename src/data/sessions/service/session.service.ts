import { sessionRepository } from "../repositories/session.repository";
import { messageRepository } from "../repositories/message.repository";
import { fileRepository } from "../repositories/file.repository";
import type { SessionDto } from "../models/session.model";
import type {
  CreateSessionInput,
  UpdateSessionInput,
  SessionRefInput,
  ListSessionsInput,
} from "../models/session.model";

// ── Service ───────────────────────────────────────────────────────────────────

export class SessionService {
  async create(input: CreateSessionInput): Promise<SessionDto> {
    return sessionRepository.create(
      input.userId,
      { title: input.title, dependentId: input.dependentId },
      input.id,
    );
  }

  async findOrCreate(
    userId: string,
    sessionId: string,
    title: string,
    dependentId?: string,
  ): Promise<SessionDto> {
    return sessionRepository.findOrCreate(userId, sessionId, {
      title,
      dependentId,
    });
  }

  async getById(input: SessionRefInput): Promise<SessionDto | null> {
    return sessionRepository.findById(input.userId, input.sessionId);
  }

  async list(input: ListSessionsInput): Promise<SessionDto[]> {
    return sessionRepository.list(input.userId, input.limit, input.dependentId);
  }

  async update(input: UpdateSessionInput): Promise<SessionDto | null> {
    return sessionRepository.update(input.userId, input.sessionId, {
      title: input.title,
    });
  }

  /**
   * Delete a session and cascade-delete its messages and files.
   */
  async delete(input: SessionRefInput): Promise<void> {
    const { userId, sessionId } = input;
    await Promise.all([
      messageRepository.deleteAll(userId, sessionId),
      fileRepository.deleteAll(userId, sessionId),
    ]);
    await sessionRepository.delete(userId, sessionId);
  }
}

/** Singleton — import this throughout the application. */
export const sessionService = new SessionService();
