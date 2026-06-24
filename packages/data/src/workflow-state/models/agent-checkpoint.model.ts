import { Timestamp } from "firebase-admin/firestore";

/** Safely convert a Firestore Timestamp (or undefined/null) to ISO string. */
function safeTimestampToISO(
  ts: Timestamp | undefined | null,
  fallback?: Timestamp | null,
): string {
  if (ts && typeof ts.toDate === "function") return ts.toDate().toISOString();
  if (fallback && typeof fallback.toDate === "function")
    return fallback.toDate().toISOString();
  return new Date().toISOString();
}

/**
 * Zod schemas for inter-node agent checkpointing.
 * These are reference schemas; actual Firestore documents may be stored
 * without strict schema validation.
 */

export type AgentCheckpointInput = {
  userId: string;
  profileId: string;
  sessionId: string;
  threadId: string;
  checkpointId: string;
  nodeName: string;
  workflowName: string;
  state: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
  ttlSeconds?: number;
};

export type AgentCheckpointOutput = {
  threadId: string;
  checkpointId: string;
  nodeName: string;
  workflowName: string;
  state: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

/**
 * Firestore document structure for agent checkpoints.
 * Stored in: workflow_threads/{threadId}/checkpoints/{checkpointId}
 */
export interface AgentCheckpointDocument {
  userId: string;
  profileId: string;
  sessionId: string;
  threadId: string;
  checkpointId: string;
  nodeName: string;
  workflowName: string;
  state: Record<string, unknown>;
  values: Record<string, unknown> | null;
  pendings: string[] | null;
  nextConfig: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp;
}

/**
 * DTO returned from checkpoint repository operations.
 */
export interface AgentCheckpointDto {
  threadId: string;
  checkpointId: string;
  nodeName: string;
  workflowName: string;
  state: Record<string, unknown>;
  values: Record<string, unknown> | null;
  pendings: string[] | null;
  nextConfig: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

/**
 * Convert Firestore document to DTO.
 */
export function toAgentCheckpointDto(
  doc: AgentCheckpointDocument,
): AgentCheckpointDto {
  return {
    threadId: doc.threadId,
    checkpointId: doc.checkpointId,
    nodeName: doc.nodeName,
    workflowName: doc.workflowName,
    state: doc.state,
    values: doc.values ?? null,
    pendings: doc.pendings ?? null,
    nextConfig: doc.nextConfig ?? null,
    ...(doc.metadata ? { metadata: doc.metadata } : {}),
    createdAt: safeTimestampToISO(doc.createdAt),
    updatedAt: safeTimestampToISO(doc.updatedAt, doc.createdAt),
    expiresAt: safeTimestampToISO(doc.expiresAt),
  };
}

/**
 * Thread checkpoint resolution result for resumption logic.
 */
export interface ThreadCheckpointResolution {
  hasCheckpoint: boolean;
  latestNodeName?: string;
  canResume: boolean;
  resumeFromCheckpoint?: AgentCheckpointDto;
  reason: string;
}
