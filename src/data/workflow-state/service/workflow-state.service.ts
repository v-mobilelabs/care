import {
  type CreateWorkflowCheckpointInput,
  type GetLatestWorkflowCheckpointInput,
  type GetWorkflowThreadStateInput,
  type SetWorkflowThreadStateInput,
  type WorkflowCheckpointDto,
  type WorkflowThreadDto,
} from "../models/workflow-state.model";
import { workflowStateRepository } from "../repositories/workflow-state.repository";

export class WorkflowStateService {
  async setThreadState(
    input: SetWorkflowThreadStateInput,
  ): Promise<WorkflowThreadDto> {
    return workflowStateRepository.upsertThreadState({
      userId: input.userId,
      profileId: input.profileId,
      sessionId: input.sessionId,
      threadId: input.threadId,
      workflowName: input.workflowName,
      state: input.state,
      metadata: input.metadata,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      ttlSeconds: input.ttlSeconds,
    });
  }

  async getActiveThreadState(
    input: GetWorkflowThreadStateInput,
  ): Promise<WorkflowThreadDto | null> {
    return workflowStateRepository.getActiveThreadState(
      input.profileId,
      input.sessionId,
      input.threadId,
    );
  }

  async createCheckpoint(
    input: CreateWorkflowCheckpointInput,
  ): Promise<WorkflowCheckpointDto> {
    return workflowStateRepository.createCheckpoint({
      userId: input.userId,
      profileId: input.profileId,
      sessionId: input.sessionId,
      threadId: input.threadId,
      workflowName: input.workflowName,
      state: input.state,
      nodeName: input.nodeName,
      metadata: input.metadata,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      ttlSeconds: input.ttlSeconds,
    });
  }

  async getLatestActiveCheckpoint(
    input: GetLatestWorkflowCheckpointInput,
  ): Promise<WorkflowCheckpointDto | null> {
    return workflowStateRepository.getLatestActiveCheckpoint(
      input.profileId,
      input.sessionId,
      input.threadId,
    );
  }
}

export const workflowStateService = new WorkflowStateService();
