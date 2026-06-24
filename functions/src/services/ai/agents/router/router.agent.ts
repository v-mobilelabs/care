/**
 * Router Agent — Main orchestrator that delegates to specialized subagents
 * Uses a single `consult_specialist` tool to route to any of the 48 registered
 * medical specialties via the SpecialistRegistry.
 *
 * One tool on the router keeps context lean and prevents model confusion
 * from a large tool-set — regardless of how many specialties are registered.
 *
 * Includes shared tools (memory, etc.) for persistent state management.
 * Streams character-by-character and sends UI feedback during routing decisions.
 */

import { ToolLoopAgent, stepCountIs, pruneMessages } from "ai";
import { getModel } from "@/lib/model.js";
import { ROUTER_AGENT_INSTRUCTIONS } from "./prompt.js";
import { consultSpecialistTool } from "../registry/consult-specialist.tool.js";
import { buildSharedTools } from "../shared-tools.js";

/**
 * Create the Router Agent with optional shared tools.
 * Main entry point that orchestrates specialist subagents for healthcare queries.
 *
 * @param contextId - Optional context ID for shared tools (memory, etc.)
 */
export function createRouterAgent(contextId?: string) {
  const proModel = getModel("pro");

  const sharedTools = contextId ? buildSharedTools(contextId) : {};

  const routerAgent = new ToolLoopAgent({
    model: proModel,
    instructions: ROUTER_AGENT_INSTRUCTIONS,
    tools: {
      consult_specialist: consultSpecialistTool,
      ...sharedTools,
    },
    stopWhen: stepCountIs(10),
    prepareStep: ({ messages }) => ({
      messages: pruneMessages({ messages }),
    }),
  });

  return routerAgent;
}

/**
 * Lazy singleton — initialized on first use, after Firebase Admin is ready.
 * Note: This singleton does not include context-specific tools (memory).
 * For context-aware agents, call createRouterAgent(contextId) directly.
 */
type RouterAgent = ReturnType<typeof createRouterAgent>;
let _instance: RouterAgent | null = null;
export function getRouterAgent(): RouterAgent {
  if (!_instance) {
    _instance = createRouterAgent();
  }
  return _instance;
}
