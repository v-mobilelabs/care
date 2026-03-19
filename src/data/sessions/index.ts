// ── Models ────────────────────────────────────────────────────────────────────
export * from "./models/session.model";
export * from "./models/message.model";
export * from "./models/file.model";

// ── Repositories ──────────────────────────────────────────────────────────────
export { sessionRepository } from "./repositories/session.repository";
export { messageRepository } from "./repositories/message.repository";
export { fileRepository } from "./repositories/file.repository";

// ── Services ──────────────────────────────────────────────────────────────────
export { sessionService, SessionService } from "./service/session.service";
export { messageService, MessageService } from "./service/message.service";
export { fileService, FileService } from "./service/file.service";

// ── Use Cases ─────────────────────────────────────────────────────────────────

// Session
export { CreateSessionUseCase } from "./use-cases/create-session.use-case";
export { FindOrCreateSessionUseCase } from "./use-cases/find-or-create-session.use-case";
export { GetSessionUseCase } from "./use-cases/get-session.use-case";
export { ListSessionsUseCase } from "./use-cases/list-sessions.use-case";
export { UpdateSessionUseCase } from "./use-cases/update-session.use-case";
export { DeleteSessionUseCase } from "./use-cases/delete-session.use-case";
export { SetSessionAgentUseCase } from "./use-cases/set-session-agent.use-case";

// Message
export { AddMessageUseCase } from "./use-cases/add-message.use-case";
export { ListMessagesUseCase } from "./use-cases/list-messages.use-case";

// Chat
export { PrepareChatUseCase } from "./use-cases/prepare-chat.use-case";
export type { PrepareChatResult } from "./use-cases/prepare-chat.use-case";

// File
export { UploadFileUseCase } from "./use-cases/upload-file.use-case";
export { GetFileUseCase } from "./use-cases/get-file.use-case";
export { ListFilesUseCase } from "./use-cases/list-files.use-case";
export { ListAllFilesUseCase } from "./use-cases/list-all-files.use-case";
export { DeleteFileUseCase } from "./use-cases/delete-file.use-case";
export { GetStorageMetricsUseCase } from "./use-cases/get-storage-metrics.use-case";
export { ClassifyFileUseCase } from "./use-cases/classify-file.use-case";
export { GetFileSignedUrlUseCase } from "./use-cases/get-file-signed-url.use-case";
export { ExtractPersonUseCase } from "./use-cases/extract-person.use-case";
export type { ExtractedPersonResult } from "./use-cases/extract-person.use-case";
