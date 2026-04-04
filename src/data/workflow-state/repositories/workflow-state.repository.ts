import {
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import {
  toWorkflowCheckpointDto,
  toWorkflowThreadDto,
  type WorkflowCheckpointDocument,
  type WorkflowCheckpointDto,
  type WorkflowThreadDocument,
  type WorkflowThreadDto,
} from "../models/workflow-state.model";
import {
  toAgentCheckpointDto,
  type AgentCheckpointDocument,
  type AgentCheckpointDto,
} from "../models/agent-checkpoint.model";

const DEFAULT_THREAD_TTL_SECONDS = 30 * 24 * 60 * 60;
const DEFAULT_CHECKPOINT_TTL_SECONDS = 14 * 24 * 60 * 60;
const LATEST_CHECKPOINT_SCAN_LIMIT = 25;

const workflowThreadsCol = () => db.collection("workflow_threads");

function toThreadDocId(
  profileId: string,
  sessionId: string,
  threadId: string,
): string {
  return `${profileId}::${sessionId}::${threadId}`;
}

const threadDoc = (profileId: string, sessionId: string, threadId: string) =>
  workflowThreadsCol().doc(toThreadDocId(profileId, sessionId, threadId));

const checkpointsCol = (
  profileId: string,
  sessionId: string,
  threadId: string,
) => threadDoc(profileId, sessionId, threadId).collection("checkpoints");

function addTtl(now: Timestamp, ttlSeconds: number): Timestamp {
  return Timestamp.fromMillis(now.toMillis() + ttlSeconds * 1000);
}

export const workflowStateRepository = {
  async upsertThreadState(args: {
    userId: string;
    profileId: string;
    sessionId: string;
    threadId: string;
    workflowName: string;
    state: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    expiresAt?: Date;
    ttlSeconds?: number;
  }): Promise<WorkflowThreadDto> {
    const ref = threadDoc(args.profileId, args.sessionId, args.threadId);

    const saved = await db.runTransaction(async (tx) => {
      const now = Timestamp.now();
      const resolvedExpiresAt = args.expiresAt
        ? Timestamp.fromDate(args.expiresAt)
        : addTtl(now, args.ttlSeconds ?? DEFAULT_THREAD_TTL_SECONDS);

      const snap = await tx.get(ref);
      const existing = snap.exists
        ? (snap.data() as WorkflowThreadDocument)
        : null;

      const doc = stripUndefined({
        userId: args.userId,
        profileId: args.profileId,
        sessionId: args.sessionId,
        threadId: args.threadId,
        workflowName: args.workflowName,
        state: args.state,
        metadata: args.metadata,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        expiresAt: resolvedExpiresAt,
      }) as unknown as WorkflowThreadDocument;

      tx.set(ref, doc, { merge: true });
      return doc;
    });

    return toWorkflowThreadDto(args.threadId, saved);
  },

  async getActiveThreadState(
    profileId: string,
    sessionId: string,
    threadId: string,
  ): Promise<WorkflowThreadDto | null> {
    const snap = await threadDoc(profileId, sessionId, threadId).get();
    if (!snap.exists) return null;

    const doc = snap.data() as WorkflowThreadDocument;
    const nowMillis = Timestamp.now().toMillis();
    const expiresAtMillis =
      doc.expiresAt && typeof doc.expiresAt.toMillis === "function"
        ? doc.expiresAt.toMillis()
        : 0;
    if (expiresAtMillis <= nowMillis) return null;
    return toWorkflowThreadDto(doc.threadId, doc);
  },

  async createCheckpoint(args: {
    userId: string;
    profileId: string;
    sessionId: string;
    threadId: string;
    workflowName: string;
    state: Record<string, unknown>;
    nodeName?: string;
    metadata?: Record<string, unknown>;
    expiresAt?: Date;
    ttlSeconds?: number;
  }): Promise<WorkflowCheckpointDto> {
    const now = Timestamp.now();
    const resolvedExpiresAt = args.expiresAt
      ? Timestamp.fromDate(args.expiresAt)
      : addTtl(now, args.ttlSeconds ?? DEFAULT_CHECKPOINT_TTL_SECONDS);

    const doc = stripUndefined({
      userId: args.userId,
      profileId: args.profileId,
      sessionId: args.sessionId,
      threadId: args.threadId,
      workflowName: args.workflowName,
      state: args.state,
      nodeName: args.nodeName,
      metadata: args.metadata,
      createdAt: now,
      expiresAt: resolvedExpiresAt,
    }) as unknown as WorkflowCheckpointDocument;

    const ref = checkpointsCol(
      args.profileId,
      args.sessionId,
      args.threadId,
    ).doc();
    await ref.set(doc);
    return toWorkflowCheckpointDto(ref.id, doc);
  },

  async getLatestActiveCheckpoint(
    profileId: string,
    sessionId: string,
    threadId: string,
  ): Promise<WorkflowCheckpointDto | null> {
    const snap = await checkpointsCol(profileId, sessionId, threadId)
      .orderBy("createdAt", "desc")
      .limit(LATEST_CHECKPOINT_SCAN_LIMIT)
      .get();

    const nowMillis = Timestamp.now().toMillis();
    const active = (snap.docs as QueryDocumentSnapshot[]).find((docSnap) => {
      const doc = docSnap.data() as WorkflowCheckpointDocument;
      if (!doc.expiresAt || typeof doc.expiresAt.toMillis !== "function")
        return false;
      return doc.expiresAt.toMillis() > nowMillis;
    });

    if (!active) return null;
    return toWorkflowCheckpointDto(
      active.id,
      active.data() as WorkflowCheckpointDocument,
    );
  },

  /**
   * Save an agent execution checkpoint (inter-node checkpointing).
   * Called after each tool execution to enable resumption if persistence fails.
   */
  async saveAgentCheckpoint(args: {
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
  }): Promise<AgentCheckpointDto> {
    const ref = checkpointsCol(
      args.profileId,
      args.sessionId,
      args.threadId,
    ).doc(args.checkpointId);

    const now = Timestamp.now();
    const resolvedExpiresAt = args.expiresAt
      ? Timestamp.fromDate(args.expiresAt)
      : addTtl(now, args.ttlSeconds ?? DEFAULT_CHECKPOINT_TTL_SECONDS);

    const doc = stripUndefined({
      userId: args.userId,
      profileId: args.profileId,
      sessionId: args.sessionId,
      threadId: args.threadId,
      checkpointId: args.checkpointId,
      nodeName: args.nodeName,
      workflowName: args.workflowName,
      state: args.state,
      values: null,
      pendings: null,
      nextConfig: null,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
      expiresAt: resolvedExpiresAt,
    }) as unknown as AgentCheckpointDocument;

    await ref.set(doc, { merge: true });
    return toAgentCheckpointDto(doc);
  },

  /**
   * Load a specific agent checkpoint by checkpointId or get latest.
   */
  async loadAgentCheckpoint(args: {
    profileId: string;
    sessionId: string;
    threadId: string;
    checkpointId?: string;
  }): Promise<AgentCheckpointDto | null> {
    const col = checkpointsCol(args.profileId, args.sessionId, args.threadId);

    let snap;
    if (args.checkpointId) {
      snap = await col.doc(args.checkpointId).get();
    } else {
      // Latest checkpoint
      const snaps = await col.orderBy("createdAt", "desc").limit(1).get();
      if (snaps.empty) return null;
      snap = snaps.docs[0];
    }

    if (!snap.exists) return null;

    const doc = snap.data() as AgentCheckpointDocument;
    const nowMillis = Timestamp.now().toMillis();

    // Check if expired — treat missing expiresAt as expired
    const expiresAtMillis =
      doc.expiresAt && typeof doc.expiresAt.toMillis === "function"
        ? doc.expiresAt.toMillis()
        : 0;
    if (expiresAtMillis <= nowMillis) return null;

    return toAgentCheckpointDto(doc);
  },

  /**
   * List all checkpoints for a thread, ordered by creation time.
   */
  async listCheckpointsForThread(args: {
    profileId: string;
    sessionId: string;
    threadId: string;
    limit?: number;
  }): Promise<AgentCheckpointDto[]> {
    const snaps = await checkpointsCol(
      args.profileId,
      args.sessionId,
      args.threadId,
    )
      .orderBy("createdAt", "desc")
      .limit(args.limit ?? 25)
      .get();

    const nowMillis = Timestamp.now().toMillis();
    const checkpoints: AgentCheckpointDto[] = [];

    for (const docSnap of snaps.docs) {
      const doc = docSnap.data() as AgentCheckpointDocument;
      const expiresAtMillis =
        doc.expiresAt && typeof doc.expiresAt.toMillis === "function"
          ? doc.expiresAt.toMillis()
          : 0;
      if (expiresAtMillis > nowMillis) {
        checkpoints.push(toAgentCheckpointDto(doc));
      }
    }

    return checkpoints;
  },
};
