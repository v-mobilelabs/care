/**
 * Knowledge Base API Types
 * Generated from OpenAPI specification
 */

// ============================================================================
// Authentication & User
// ============================================================================

export interface User {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;
}

export interface AuthCallbackRequest {
  idToken: string;
}

export interface AuthCallbackResponse {
  success: boolean;
  sessionCookie: string;
  user: {
    uid: string;
    email: string;
    orgId: string;
    role: "member" | "admin" | "owner";
  };
}

export interface SendMagicLinkRequest {
  email: string;
  captchaToken?: string;
}

export interface SendMagicLinkResponse {
  success: boolean;
  message: string;
}

// ============================================================================
// Contexts
// ============================================================================

export interface Context {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  windowSize: number | null;
  documentCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContextDocument {
  id: string;
  role: "system" | "user" | "assistant";
  metadata?: Record<string, unknown>;
  parts: Array<Record<string, unknown>>;
}

export interface CreateContextRequest {
  name: string;
  description?: string;
  windowSize?: number;
}

export interface CreateContextResponse {
  context: Context;
}

export interface AddContextDocumentRequest {
  role: "system" | "user" | "assistant";
  parts: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
}

export interface AddContextDocumentResponse {
  document: ContextDocument;
}

export interface GetContextDocumentsResponse {
  documents: {
    items: ContextDocument[];
    hasNext: boolean;
    nextCursor: string | null;
  };
}

export interface DeleteContextDocumentsResponse {
  deleted: boolean;
}

// ============================================================================
// Stores
// ============================================================================

export interface Store {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  source: {
    id: string;
    collection: string;
  };
  documentCount: number;
  customCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoreDocument {
  id: string;
  orgId: string;
  storeId: string;
  name: string;
  kind: "data" | "file" | "node";
  type: string;
  status: "pending" | "completed" | "error";
  error: string | null;
  summary: string | null;
  keywords: string[];
  source: {
    id: string;
    collection: string;
  };
  data: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStoreRequest {
  name: string;
  description?: string;
  source: {
    id: string;
    collection: string;
  };
}

export interface CreateStoreResponse {
  store: Store;
}

export interface CreateStoreDocumentRequest {
  name: string;
  source: {
    id: string;
    collection: string;
  };
  data: Record<string, unknown>;
  keywords?: string[];
}

export interface CreateStoreDocumentResponse {
  document: StoreDocument;
}

export interface UpdateStoreRequest {
  name?: string;
  description?: string;
  source?: {
    id: string;
    collection: string;
  };
}

export interface UpdateStoreResponse {
  store: Store;
}

export interface UpdateStoreDocumentRequest {
  name?: string;
  source?: {
    id: string;
    collection: string;
  };
  data?: Record<string, unknown>;
  keywords?: string[];
}

export interface UpdateStoreDocumentResponse {
  document: StoreDocument;
}

export interface GetStoreDocumentsResponse {
  items: StoreDocument[];
  hasNext: boolean;
  nextCursor: string | null;
}

// ============================================================================
// Query
// ============================================================================

export interface QueryStoresRequest {
  storeId: string;
  query: string;
  filters?: Record<string, unknown>;
  topK?: number;
  enableRagEvaluation?: boolean;
}

export interface QueryResult {
  items: Array<Record<string, unknown>>;
  hasNext: boolean;
  nextCursor: string | null;
}

// ============================================================================
// Memories
// ============================================================================

export interface Memory {
  id: string;
  orgId: string;
  description: string | null;
  documentCapacity: number;
  condenseThresholdPercent: number;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryDocument {
  id: string;
  title: string;
  content: string;
  isCondensationSummary: boolean;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMemoryRequest {
  description?: string;
  documentCapacity?: number;
  condenseThresholdPercent?: number;
}

export interface CreateMemoryResponse {
  memory: Memory;
}

export interface AddMemoryDocumentRequest {
  content: string;
  title?: string;
}

export interface AddMemoryDocumentResponse {
  document: MemoryDocument;
}

export interface GetMemoryResponse {
  memory: Memory;
}

export interface GetMemoryDocumentsResponse {
  items: MemoryDocument[];
  hasNext: boolean;
  nextCursor: string | null;
}

// ============================================================================
// Files
// ============================================================================

export interface File {
  id: string;
  orgId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  kind: string;
  size: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileUploadResponse {
  file: File;
}

export interface FileDownloadResponse {
  url: string;
  expiresIn: number;
}

export interface FileThumbnailResponse {
  url: string;
  data: string;
  contentType: string;
  isImage: boolean;
}

export interface FileDeleteResponse {
  deleted: boolean;
}

// ============================================================================
// Common
// ============================================================================

export interface Error {
  error: string;
}

export interface HealthResponse {
  status: string;
}

// ============================================================================
// Client Configuration
// ============================================================================

export interface KnowledgeBaseClientConfig {
  baseURL?: string;
  apiKey?: string;
  userToken?: string;
  timeout?: number;
}
