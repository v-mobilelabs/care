// ── Models ────────────────────────────────────────────────────────────────────
export * from "./models/session.model";
export * from "./models/message.model";

// ── Repositories ──────────────────────────────────────────────────────────────
export { sessionRepository } from "./repositories/session.repository";
export { messageRepository } from "./repositories/message.repository";

// ── Services ──────────────────────────────────────────────────────────────────
export { sessionService, SessionService } from "./service/session.service";
export { messageService, MessageService } from "./service/message.service";

// ── Use Cases ─────────────────────────────────────────────────────────────────

// Session
export { CreateSessionUseCase } from "./use-cases/create-session.use-case";
export { FindOrCreateSessionUseCase } from "./use-cases/find-or-create-session.use-case";
export { GetSessionUseCase } from "./use-cases/get-session.use-case";
export { ListSessionsUseCase } from "./use-cases/list-sessions.use-case";
export { ListSessionsPaginatedUseCase } from "./use-cases/list-sessions-paginated.use-case";
export { UpdateSessionUseCase } from "./use-cases/update-session.use-case";
export { DeleteSessionUseCase } from "./use-cases/delete-session.use-case";
export { SetSessionAgentUseCase } from "./use-cases/set-session-agent.use-case";

// Message
export { AddMessageUseCase } from "./use-cases/add-message.use-case";
export { ListMessagesUseCase } from "./use-cases/list-messages.use-case";

// Chat
export { PrepareChatUseCase } from "./use-cases/prepare-chat.use-case";
export type { PrepareChatResult } from "./use-cases/prepare-chat.use-case";
