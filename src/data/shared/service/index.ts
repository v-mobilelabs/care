// Re-export RAG services from a single entry point
export { RAGService, ragService } from "./rag/rag.service";
export type {
  DocumentChunk,
  SearchResult,
  SearchOptions,
} from "./rag/rag.service";

export { RAGIndexerService, ragIndexer } from "./rag/rag-indexer.service";

export {
  RAGContextBuilderService,
  ragContextBuilder,
} from "./rag/rag-context-builder.service";
export type {
  BuildContextParams,
  RAGContextResult,
} from "./rag/rag-context-builder.service";

export { RerankingService, rerankingService } from "./rag/reranking.service";

export {
  ContextCacheService,
  contextCacheService,
} from "./context-cache.service";
export type { RerankOptions } from "./rag/reranking.service";
