import { workflowStateRepository } from "@/data/workflow-state/repositories/workflow-state.repository";

/**
 * Inter-node checkpointing middleware for tool execution.
 *
 * Saves agent state after each tool call completes, enabling resumption
 * if background persistence fails.
 *
 * Usage:
 * ```ts
 * const wrappedTools = withToolCheckpointing(tools, {
 *   userId,
 *   profileId,
 *   sessionId,
 *   threadId,
 *   checkpointPrefix: "chat_...",
 * });
 * ```
 */

export interface ToolCheckpointingConfig {
  userId: string;
  profileId: string;
  sessionId: string;
  threadId: string;
  checkpointPrefix: string;
  workflowName?: string;
}

/**
 * Wraps tool functions to save checkpoints after execution.
 *
 * Each tool call is wrapped to:
 * 1. Execute the tool
 * 2. Save a checkpoint with the tool output
 * 3. Return the result
 *
 * If checkpointing fails, the tool result is still returned (best-effort).
 */
export function withToolCheckpointing<T extends Record<string, unknown>>(
  tools: T,
  config: ToolCheckpointingConfig,
): T {
  const wrapped = { ...tools };
  const counter = { value: 0 };

  for (const [toolName, toolFn] of Object.entries(tools)) {
    if (typeof toolFn !== "function") continue;

    wrapped[toolName as keyof T] = (async (...args: unknown[]) => {
      const checkpointId = `${config.checkpointPrefix}_tool_${toolName}_${++counter.value}`;

      try {
        // Execute the tool
        const result = await toolFn(...args);

        // Best-effort checkpoint: don't block on checkpoint save failure
        await workflowStateRepository
          .saveAgentCheckpoint({
            userId: config.userId,
            profileId: config.profileId,
            sessionId: config.sessionId,
            threadId: config.threadId,
            checkpointId,
            nodeName: `tool_${toolName}`,
            workflowName: config.workflowName ?? "agent-execution",
            state: {
              tool: toolName,
              input: args[0],
              output: result,
              timestamp: new Date().toISOString(),
            },
            metadata: {
              toolName,
              checkpointSequence: counter.value,
              timestamp: new Date().toISOString(),
            },
          })
          .catch((err: unknown) => {
            console.error(
              `[ToolCheckpointing] Failed to save checkpoint for ${toolName}:`,
              err,
            );
          });

        return result;
      } catch (err) {
        console.error(`[ToolCheckpointing] Tool ${toolName} failed:`, err);
        throw err;
      }
    }) as T[keyof T];
  }

  return wrapped;
}
