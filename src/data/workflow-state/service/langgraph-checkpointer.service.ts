/**
 * Inter-Node Checkpointing Utilities
 *
 * This module provides helpers for saving agent execution checkpoints
 * at strategic points during the chat flow.
 *
 * Checkpoints are saved:
 * 1. After each tool call (via tool-checkpointing.middleware.ts)
 * 2. After persistence completes (via chat-api-flow.workflow.ts)
 * 3. Before any expensive operation that could fail
 *
 * On resumption (e.g., after a failure):
 * 1. Load the latest checkpoint
 * 2. Skip re-execution of already-completed steps
 * 3. Continue from the checkpoint state
 */

import { workflowStateRepository } from "@/data/workflow-state/repositories/workflow-state.repository";
import type { AgentCheckpointDto } from "@/data/workflow-state/models/agent-checkpoint.model";

/**
 * Configuration for inter-node checkpointing.
 */
export interface CheckpointingConfig {
  profileId: string;
  sessionId: string;
  threadId: string;
  userId: string;
  workflowName: string;
  checkpointPrefix: string;
}

/**
 * Helper to save a checkpoint with standard configuration.
 * This is called from tool wrappers and workflow nodes.
 */
export async function saveCheckpoint(args: {
  config: CheckpointingConfig;
  nodeName: string;
  state: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): Promise<AgentCheckpointDto> {
  return workflowStateRepository.saveAgentCheckpoint({
    userId: args.config.userId,
    profileId: args.config.profileId,
    sessionId: args.config.sessionId,
    threadId: args.config.threadId,
    checkpointId: `${args.config.checkpointPrefix}_${args.nodeName}_${Date.now()}`,
    nodeName: args.nodeName,
    workflowName: args.config.workflowName,
    state: args.state,
    metadata: {
      ...args.metadata,
      checkpointingConfig: args.config.checkpointPrefix,
    },
  });
}

/**
 * Helper to load a checkpoint, optionally filtering by node name.
 */
export async function loadCheckpoint(args: {
  profileId: string;
  sessionId: string;
  threadId: string;
  checkpointId?: string;
}): Promise<AgentCheckpointDto | null> {
  return workflowStateRepository.loadAgentCheckpoint(args);
}

/**
 * Helper to list checkpoints for a thread.
 */
export async function listCheckpoints(args: {
  profileId: string;
  sessionId: string;
  threadId: string;
  limit?: number;
}): Promise<AgentCheckpointDto[]> {
  return workflowStateRepository.listCheckpointsForThread(args);
}
