/**
 * Knowledge Base SDK Factory
 */

import { KnowledgeBaseClient } from "./client";
import type { KnowledgeBaseClientConfig } from "./types";

/**
 * Create a Knowledge Base API client with sensible defaults
 *
 * @param config Optional configuration
 * @returns KnowledgeBaseClient instance
 *
 * @example
 * ```ts
 * const client = createKnowledgeBaseClient({
 *   apiKey: process.env.KB_API_KEY,
 *   baseURL: 'https://kb.cosmoops.com'
 * });
 *
 * // Create a context
 * const context = await client.createContext({
 *   name: 'Medical Records',
 *   description: 'Patient medical history context'
 * });
 * ```
 */
export function createKnowledgeBaseClient(
  config: KnowledgeBaseClientConfig = {},
): KnowledgeBaseClient {
  return new KnowledgeBaseClient({
    baseURL:
      config.baseURL || process.env.KB_BASE_URL || "https://kb.cosmoops.com",
    apiKey: config.apiKey || process.env.KB_API_KEY,
    userToken: config.userToken || process.env.KB_USER_TOKEN,
    timeout: config.timeout || 30000,
  });
}
