import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

export interface WorkflowThreadDocument {
  userId: string;
  profileId: string;
  sessionId: string;
  threadId: string;
  workflowName: string;
  state: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp;
}

export interface WorkflowCheckpointDocument {
  userId: string;
  profileId: string;
  sessionId: string;
  threadId: string;
  workflowName: string;
  state: Record<string, unknown>;
  nodeName?: string;
  metadata?: Record<string, unknown>;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export interface WorkflowThreadDto {
  threadId: string;
  userId: string;
  profileId: string;
  sessionId: string;
  workflowName: string;
  state: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface WorkflowCheckpointDto {
  checkpointId: string;
  userId: string;
  profileId: string;
  sessionId: string;
  threadId: string;
  workflowName: string;
  state: Record<string, unknown>;
  nodeName?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  expiresAt: string;
}

export function toWorkflowThreadDto(
  threadId: string,
  doc: WorkflowThreadDocument,
): WorkflowThreadDto {
  return {
    threadId,
    userId: doc.userId,
    profileId: doc.profileId,
    sessionId: doc.sessionId,
    workflowName: doc.workflowName,
    state: doc.state,
    ...(doc.metadata ? { metadata: doc.metadata } : {}),
    createdAt: doc.createdAt.toDate().toISOString(),
    updatedAt: doc.updatedAt.toDate().toISOString(),
    expiresAt: doc.expiresAt.toDate().toISOString(),
  };
}

export function toWorkflowCheckpointDto(
  checkpointId: string,
  doc: WorkflowCheckpointDocument,
): WorkflowCheckpointDto {
  return {
    checkpointId,
    userId: doc.userId,
    profileId: doc.profileId,
    sessionId: doc.sessionId,
    threadId: doc.threadId,
    workflowName: doc.workflowName,
    state: doc.state,
    ...(doc.nodeName ? { nodeName: doc.nodeName } : {}),
    ...(doc.metadata ? { metadata: doc.metadata } : {}),
    createdAt: doc.createdAt.toDate().toISOString(),
    expiresAt: doc.expiresAt.toDate().toISOString(),
  };
}

const JsonRecordSchema = z.record(z.string(), z.unknown());

export const SetWorkflowThreadStateSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  profileId: z.string().min(1, { message: "profileId is required" }),
  sessionId: z.string().min(1, { message: "sessionId is required" }),
  threadId: z.string().min(1, { message: "threadId is required" }),
  workflowName: z.string().min(1, { message: "workflowName is required" }),
  state: JsonRecordSchema,
  metadata: JsonRecordSchema.optional(),
  /** ISO-8601 timestamp. When omitted, repository computes from ttlSeconds. */
  expiresAt: z.iso.datetime().optional(),
  /** Relative expiration window from now. Defaults to 30 days. */
  ttlSeconds: z.number().int().positive().optional(),
});

export type SetWorkflowThreadStateInput = z.infer<
  typeof SetWorkflowThreadStateSchema
>;

export const GetWorkflowThreadStateSchema = z.object({
  profileId: z.string().min(1, { message: "profileId is required" }),
  sessionId: z.string().min(1, { message: "sessionId is required" }),
  threadId: z.string().min(1, { message: "threadId is required" }),
});

export type GetWorkflowThreadStateInput = z.infer<
  typeof GetWorkflowThreadStateSchema
>;

export const CreateWorkflowCheckpointSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  profileId: z.string().min(1, { message: "profileId is required" }),
  sessionId: z.string().min(1, { message: "sessionId is required" }),
  threadId: z.string().min(1, { message: "threadId is required" }),
  workflowName: z.string().min(1, { message: "workflowName is required" }),
  state: JsonRecordSchema,
  nodeName: z.string().min(1).optional(),
  metadata: JsonRecordSchema.optional(),
  expiresAt: z.iso.datetime().optional(),
  /** Relative expiration window from now. Defaults to 14 days. */
  ttlSeconds: z.number().int().positive().optional(),
});

export type CreateWorkflowCheckpointInput = z.infer<
  typeof CreateWorkflowCheckpointSchema
>;

export const GetLatestWorkflowCheckpointSchema = z.object({
  profileId: z.string().min(1, { message: "profileId is required" }),
  sessionId: z.string().min(1, { message: "sessionId is required" }),
  threadId: z.string().min(1, { message: "threadId is required" }),
});

export type GetLatestWorkflowCheckpointInput = z.infer<
  typeof GetLatestWorkflowCheckpointSchema
>;
