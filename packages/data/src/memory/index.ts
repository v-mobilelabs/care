// ── Models ────────────────────────────────────────────────────────────────────
export * from "./models/memory.model";

// ── Repositories ──────────────────────────────────────────────────────────────
export { memoryRepository } from "./repositories/memory.repository";

// ── Services ──────────────────────────────────────────────────────────────────
export { memoryService, MemoryService } from "./service/memory.service";

// ── Use Cases ─────────────────────────────────────────────────────────────────
export { SaveMemoryUseCase } from "./use-cases/save-memory.use-case";
export { RecallMemoriesUseCase } from "./use-cases/recall-memories.use-case";
export { DeleteMemoryUseCase } from "./use-cases/delete-memory.use-case";
export { ListMemoriesUseCase } from "./use-cases/list-memories.use-case";
export { DeleteManyMemoriesUseCase } from "./use-cases/delete-many-memories.use-case";

// ── Auto-extraction ───────────────────────────────────────────────────────────
export {
  extractAndSaveMemories,
  extractTextFromParts,
} from "./service/extract-memories";
