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
      input.profileId,
      { title: input.title },
      input.id,
    );
  }

  async findOrCreate(
    userId: string,
    profileId: string,
    sessionId: string,
    title: string,
  ): Promise<SessionDto> {
    return sessionRepository.findOrCreate(userId, profileId, sessionId, {
      title,
    });
  }

  async getById(input: SessionRefInput): Promise<SessionDto | null> {
    return sessionRepository.findById(
      input.userId,
      input.profileId,
      input.sessionId,
    );
  }

  async list(input: ListSessionsInput): Promise<SessionDto[]> {
    return sessionRepository.list(input.userId, input.profileId, input.limit);
  }

  async update(input: UpdateSessionInput): Promise<SessionDto | null> {
    return sessionRepository.update(
      input.userId,
      input.profileId,
      input.sessionId,
      {
        title: input.title,
      },
    );
  }

  /**
   * Delete a session and cascade-delete its messages and files.
   */
  async delete(input: SessionRefInput): Promise<void> {
    const { userId, profileId, sessionId } = input;
    await Promise.all([
      messageRepository.deleteAll(userId, profileId, sessionId),
      fileRepository.deleteAll(userId, profileId, sessionId),
    ]);
    await sessionRepository.delete(userId, profileId, sessionId);
  }
}

/** Singleton — import this throughout the application. */
export const sessionService = new SessionService();
