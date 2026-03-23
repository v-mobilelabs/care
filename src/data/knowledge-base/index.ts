// ── Models ────────────────────────────────────────────────────────────────────
export * from "./models/knowledge-base.model";

// ── Repository ────────────────────────────────────────────────────────────────
export { knowledgeBaseRepository } from "./repositories/knowledge-base.repository";

// ── Service ───────────────────────────────────────────────────────────────────
export {
  knowledgeBaseService,
  KnowledgeBaseService,
  type KBSearchResult,
} from "./service/knowledge-base.service";

// ── Use Cases ─────────────────────────────────────────────────────────────────
export { CreateKnowledgeBaseEntryUseCase } from "./use-cases/create-knowledge-base-entry.use-case";
export { ListKnowledgeBaseUseCase } from "./use-cases/list-knowledge-base.use-case";
export { GetKnowledgeBaseEntryUseCase } from "./use-cases/get-knowledge-base-entry.use-case";
export { UpdateKnowledgeBaseEntryUseCase } from "./use-cases/update-knowledge-base-entry.use-case";
export { DeleteKnowledgeBaseEntryUseCase } from "./use-cases/delete-knowledge-base-entry.use-case";
export { SearchKnowledgeBaseUseCase } from "./use-cases/search-knowledge-base.use-case";
