/**
 * Executes Gemini Live API tool calls during real-time sessions.
 * Maps Live API function calls to existing agent tools.
 */

import type { UIMessage } from "ai";

export interface LiveToolCall {
  id: string;
  function: {
    name: string;
    args?: Record<string, unknown>;
  };
}

export interface LiveToolResponse {
  id: string; // Must match LiveToolCall.id
  result?: unknown;
  error?: string;
}

export interface LiveToolCallHandler {
  (args: Record<string, unknown>): unknown | Promise<unknown>;
}

/**
 * Service for executing tool calls during Gemini Live sessions.
 * Supports both local execution and remote execution via API route.
 */
export class LiveToolExecutor {
  private localToolHandlers: Map<string, LiveToolCallHandler>;

  constructor() {
    this.localToolHandlers = new Map();
  }

  /**
   * Register a local tool handler.
   * Fast tools (memory, lookup) should execute locally.
   */
  registerLocalTool(toolName: string, handler: LiveToolCallHandler): void {
    this.localToolHandlers.set(toolName, handler);
  }

  /**
   * Execute a Live API tool call.
   * Routes to local handler, remote API, or returns error.
   */
  async executeToolCall(call: LiveToolCall): Promise<LiveToolResponse> {
    try {
      const toolName = call.function.name;
      const args = call.function.args ?? {};

      // Check for registered local handler
      const localHandler = this.localToolHandlers.get(toolName);
      if (localHandler) {
        const result = await Promise.resolve(localHandler(args));
        return { id: call.id, result };
      }

      // Tool not registered locally — return error
      return {
        id: call.id,
        error: `Tool '${toolName}' not available in live mode. Register a handler or use async execution.`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        id: call.id,
        error: `Tool execution failed: ${message}`,
      };
    }
  }

  /**
   * Execute multiple tool calls in parallel.
   */
  async executeToolCalls(calls: LiveToolCall[]): Promise<LiveToolResponse[]> {
    return Promise.all(calls.map((call) => this.executeToolCall(call)));
  }

  /**
   * Create a tool part for persisting in message history.
   */
  createToolPart(response: LiveToolResponse): UIMessage["parts"][0] {
    const toolName = response.id.split("_")[0] ?? "unknown";
    return {
      type: `tool-${toolName}`,
      toolCallId: response.id,
      state: "output-available",
      input: {}, // Original inputs were in the call
      output: response.error ? { error: response.error } : response.result,
    };
  }
}

/**
 * Singleton executor — configure with your local tool handlers.
 * Initialize at app start before live sessions begin.
 */
export const liveToolExecutor = new LiveToolExecutor();

/**
 * Configuration for common healthcare tools in live mode.
 * Call this during app initialization.
 */
export function initializeLiveToolHandlers(options?: {
  /** Handle memory tool calls (save/recall patient facts) */
  onMemoryTool?: (args: Record<string, unknown>) => unknown | Promise<unknown>;
  /** Handle patient lookup tool calls */
  onPatientLookup?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  /** Handle medication lookup tool calls */
  onMedicationLookup?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
  /** Handle condition lookup tool calls */
  onConditionLookup?: (
    args: Record<string, unknown>,
  ) => unknown | Promise<unknown>;
}): void {
  if (options?.onMemoryTool) {
    liveToolExecutor.registerLocalTool("memory", options.onMemoryTool);
  }

  if (options?.onPatientLookup) {
    liveToolExecutor.registerLocalTool(
      "patientLookup",
      options.onPatientLookup,
    );
  }

  if (options?.onMedicationLookup) {
    liveToolExecutor.registerLocalTool(
      "medicationLookup",
      options.onMedicationLookup,
    );
  }

  if (options?.onConditionLookup) {
    liveToolExecutor.registerLocalTool(
      "conditionLookup",
      options.onConditionLookup,
    );
  }
}
