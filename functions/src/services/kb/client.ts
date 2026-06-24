/**
 * Knowledge Base API Client
 * Generated from OpenAPI specification
 */

import type {
  KnowledgeBaseClientConfig,
  HealthResponse,
  CreateContextRequest,
  CreateContextResponse,
  AddContextDocumentRequest,
  AddContextDocumentResponse,
  GetContextDocumentsResponse,
  DeleteContextDocumentsResponse,
  CreateStoreRequest,
  CreateStoreResponse,
  CreateStoreDocumentRequest,
  CreateStoreDocumentResponse,
  UpdateStoreRequest,
  UpdateStoreResponse,
  UpdateStoreDocumentRequest,
  UpdateStoreDocumentResponse,
  GetStoreDocumentsResponse,
  QueryStoresRequest,
  QueryResult,
  CreateMemoryRequest,
  CreateMemoryResponse,
  AddMemoryDocumentRequest,
  AddMemoryDocumentResponse,
  GetMemoryResponse,
  GetMemoryDocumentsResponse,
  FileUploadResponse,
  FileDownloadResponse,
  FileThumbnailResponse,
  FileDeleteResponse,
  SendMagicLinkRequest,
  SendMagicLinkResponse,
  AuthCallbackRequest,
  AuthCallbackResponse,
  User,
} from "./types";

export class KnowledgeBaseClient {
  private readonly baseURL: string;
  private apiKey?: string;
  private userToken?: string;
  private readonly timeout: number;

  constructor(config: KnowledgeBaseClientConfig = {}) {
    this.baseURL = config.baseURL || "https://kb.cosmoops.com";
    this.apiKey = config.apiKey;
    this.userToken = config.userToken;
    this.timeout = config.timeout || 30000;
  }

  /**
   * Set API key for subsequent requests
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Set user token for subsequent requests
   */
  setUserToken(userToken: string): void {
    this.userToken = userToken;
  }

  /**
   * Make HTTP request to the Knowledge Base API
   */
  private async request<T>(
    method: string,
    path: string,
    data?: unknown,
    useAuth: "api-key" | "user-token" | "none" = "api-key",
  ): Promise<T> {
    const url = `${this.baseURL}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (useAuth === "api-key" && this.apiKey) {
      headers["x-api-key"] = this.apiKey;
    } else if (useAuth === "user-token" && this.userToken) {
      headers["Authorization"] = `Bearer ${this.userToken}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(error.error || JSON.stringify(error));
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Upload file to the Knowledge Base API
   */
  private async sendFormData(
    path: string,
    file: File | Blob,
    filename?: string,
  ): Promise<Response> {
    const url = `${this.baseURL}${path}`;
    const headers: Record<string, string> = {};

    if (this.apiKey) {
      headers["x-api-key"] = this.apiKey;
    }

    const formData = new FormData();
    formData.append("file", file, filename || "file");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(error.error || JSON.stringify(error));
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // ============================================================================
  // Health
  // ============================================================================

  /**
   * Health check
   */
  async healthCheck(): Promise<HealthResponse> {
    return this.request("GET", "/api/v1/health", undefined, "none");
  }

  // ============================================================================
  // Contexts
  // ============================================================================

  /**
   * Create a context
   */
  async createContext(
    request: CreateContextRequest,
  ): Promise<CreateContextResponse> {
    return this.request("POST", "/api/v1/context", request);
  }

  /**
   * Add a document to a context
   */
  async addContextDocument(
    contextId: string,
    request: AddContextDocumentRequest,
  ): Promise<AddContextDocumentResponse> {
    return this.request(
      "POST",
      `/api/v1/context/${contextId}/documents`,
      request,
    );
  }

  /**
   * Get context documents
   */
  async getContextDocuments(
    contextId: string,
  ): Promise<GetContextDocumentsResponse> {
    return this.request("GET", `/api/v1/context/${contextId}/documents`);
  }

  /**
   * Delete all documents in a context
   */
  async deleteContextDocuments(
    contextId: string,
  ): Promise<DeleteContextDocumentsResponse> {
    return this.request("DELETE", `/api/v1/context/${contextId}/documents`);
  }

  /**
   * Delete a context
   */
  async deleteContext(contextId: string): Promise<{ deleted: boolean }> {
    return this.request("DELETE", `/api/v1/context/${contextId}`);
  }

  // ============================================================================
  // Stores
  // ============================================================================

  /**
   * Create a store
   */
  async createStore(request: CreateStoreRequest): Promise<CreateStoreResponse> {
    return this.request("POST", "/api/v1/store", request);
  }

  /**
   * Update a store
   */
  async updateStore(
    storeId: string,
    request: UpdateStoreRequest,
  ): Promise<UpdateStoreResponse> {
    return this.request("PUT", `/api/v1/store/${storeId}`, request);
  }

  /**
   * Delete a store
   */
  async deleteStore(storeId: string): Promise<{ deleted: boolean }> {
    return this.request("DELETE", `/api/v1/store/${storeId}`);
  }

  /**
   * Get store documents
   */
  async getStoreDocuments(storeId: string): Promise<GetStoreDocumentsResponse> {
    return this.request("GET", `/api/v1/store/${storeId}/documents`);
  }

  /**
   * Create a store document
   */
  async createStoreDocument(
    storeId: string,
    request: CreateStoreDocumentRequest,
  ): Promise<CreateStoreDocumentResponse> {
    return this.request("POST", `/api/v1/store/${storeId}/documents`, request);
  }

  /**
   * Update a store document
   */
  async updateStoreDocument(
    storeId: string,
    documentId: string,
    request: UpdateStoreDocumentRequest,
  ): Promise<UpdateStoreDocumentResponse> {
    return this.request(
      "PUT",
      `/api/v1/store/${storeId}/documents/${documentId}`,
      request,
    );
  }

  // ============================================================================
  // Query
  // ============================================================================

  /**
   * Query a store
   */
  async queryStore(request: QueryStoresRequest): Promise<QueryResult> {
    return this.request("POST", "/api/v1/query", request);
  }

  // ============================================================================
  // Memories
  // ============================================================================

  /**
   * Create a memory
   */
  async createMemory(
    request?: CreateMemoryRequest,
  ): Promise<CreateMemoryResponse> {
    return this.request("POST", "/api/v1/memories", request);
  }

  /**
   * Get memory details
   */
  async getMemory(memoryId: string): Promise<GetMemoryResponse> {
    return this.request("GET", `/api/v1/memories/${memoryId}`);
  }

  /**
   * Add a document to a memory (legacy endpoint)
   */
  async addMemoryDocumentLegacy(
    memoryId: string,
    request: AddMemoryDocumentRequest,
  ): Promise<AddMemoryDocumentResponse> {
    return this.request("POST", `/api/v1/memories/${memoryId}`, request);
  }

  /**
   * Get memory documents
   */
  async getMemoryDocuments(
    memoryId: string,
  ): Promise<GetMemoryDocumentsResponse> {
    return this.request("GET", `/api/v1/memories/${memoryId}/documents`);
  }

  /**
   * Add a document to a memory
   */
  async addMemoryDocument(
    memoryId: string,
    request: AddMemoryDocumentRequest,
  ): Promise<AddMemoryDocumentResponse> {
    return this.request(
      "POST",
      `/api/v1/memories/${memoryId}/documents`,
      request,
    );
  }

  // ============================================================================
  // Files
  // ============================================================================

  /**
   * Upload a file
   */
  async uploadFile(
    file: File | Blob,
    filename?: string,
  ): Promise<FileUploadResponse> {
    const response = await this.sendFormData(
      "/api/v1/file/upload",
      file,
      filename,
    );
    return response.json();
  }

  /**
   * Generate a signed download URL
   */
  async downloadFile(fileId: string): Promise<FileDownloadResponse> {
    return this.request("GET", `/api/v1/file/${fileId}/download`);
  }

  /**
   * Get file thumbnail or fallback icon
   */
  async getFileThumbnail(fileId: string): Promise<FileThumbnailResponse> {
    return this.request("GET", `/api/v1/file/${fileId}/thumbnail`);
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<FileDeleteResponse> {
    return this.request("DELETE", `/api/v1/file/${fileId}`);
  }

  // ============================================================================
  // Authentication
  // ============================================================================

  /**
   * Send magic link to email for organization member authentication
   */
  async sendMagicLink(
    request: SendMagicLinkRequest,
  ): Promise<SendMagicLinkResponse> {
    return this.request("POST", "/api/v1/auth/magic-link", request, "api-key");
  }

  /**
   * Validate magic link and create session
   */
  async authCallback(
    request: AuthCallbackRequest,
  ): Promise<AuthCallbackResponse> {
    return this.request("POST", "/api/v1/auth/callback", request, "api-key");
  }

  // ============================================================================
  // Profile
  // ============================================================================

  /**
   * Get user profile
   */
  async getUserProfile(): Promise<{ success: boolean; user: User }> {
    return this.request("GET", "/api/v1/profile/me", undefined, "user-token");
  }

  /**
   * Update user profile
   */
  async updateUserProfile(data: {
    displayName?: string;
    photoURL?: string;
  }): Promise<{ success: boolean; message: string }> {
    return this.request("POST", "/api/v1/profile/me", data, "user-token");
  }

  /**
   * Delete user account
   */
  async deleteUserAccount(): Promise<{ success: boolean; message: string }> {
    return this.request(
      "DELETE",
      "/api/v1/profile/me",
      undefined,
      "user-token",
    );
  }
}
