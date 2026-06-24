import { sessionRepository } from "../repositories/session.repository";
import { messageRepository } from "../repositories/message.repository";
import { fileRepository } from "@/data/files";
import { kbContextService } from "@/data/knowledge-base/service/kb-context.service";
import type {
  SessionDto,
  PaginatedSessions,
  CreateSessionInput,
  UpdateSessionInput,
  SessionRefInput,
  ListSessionsInput,
  ListSessionsPaginatedInput,
} from "../models/session.model";

// ── Service ───────────────────────────────────────────────────────────────────

export class SessionService {
  async create(input: CreateSessionInput): Promise<SessionDto> {
    // Create the session
    const session = await sessionRepository.create(
      input.userId,
      input.profileId,
      { title: input.title },
      input.id,
    );

    // Also create a KB context for this session
    // Use the session ID as the context ID for consistency
    try {
      await kbContextService.create({
        contextId: session.id,
        userId: input.userId,
        profileId: input.profileId,
        sessionTitle: input.title ?? "New Session",
      });
    } catch (error) {
      console.error(
        "[SessionService.create] Failed to create KB context:",
        error,
      );
      // Don't fail the entire session creation if KB context fails
    }

    return session;
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

  async listPaginated(
    input: ListSessionsPaginatedInput,
  ): Promise<PaginatedSessions> {
    return sessionRepository.listPaginated(
      input.userId,
      input.profileId,
      input.limit,
      input.cursor,
      {
        agent: input.agent,
        q: input.q,
        sortDir: input.sortDir,
      },
    );
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
      fileRepository.deleteAll(profileId, sessionId),
    ]);
    await sessionRepository.delete(userId, profileId, sessionId);
  }
}

/** Singleton — import this throughout the application. */
export const sessionService = new SessionService();
