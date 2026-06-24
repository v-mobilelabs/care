/**
 * Knowledge Base SDK Barrel Export
 */

import { createKnowledgeBaseClient } from "./factory";

export * from "./types";
export { KnowledgeBaseClient } from "./client";
export { createKnowledgeBaseClient } from "./factory";

/**
 * Global KB client instance
 * Used for memory store and other services
 */
export const KB = createKnowledgeBaseClient();
