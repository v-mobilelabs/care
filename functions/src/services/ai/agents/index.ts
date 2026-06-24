/**
 * Healthcare Agents Architecture
 * Router → SpecialistRegistry → 48 specialist ToolLoopAgents
 * All agents include shared tools (memory, etc.) when contextId is provided
 */

// ─── Router ───────────────────────────────────────────────────────────────────
export { createRouterAgent, getRouterAgent } from "./router/router.agent.js";
export {
  ROUTER_AGENT_INSTRUCTIONS,
  ROUTER_AGENT_WELCOME,
} from "./router/prompt.js";

// ─── Registry ─────────────────────────────────────────────────────────────────
export {
  Specialty,
  SpecialtyGroup,
  SPECIALTY_META,
} from "./registry/specialty.enum.js";
export type { SpecialtyMeta } from "./registry/specialty.enum.js";
export {
  getSpecialistAgent,
  resetRegistry,
} from "./registry/agent-registry.js";
export { consultSpecialistTool } from "./registry/consult-specialist.tool.js";

// ─── Shared Tools ─────────────────────────────────────────────────────────────
export {
  buildSharedTools,
} from "./shared-tools.js";

// ─── Specialist Prompts ───────────────────────────────────────────────────────
export { getSpecialistPrompt } from "./specialists/index.js";

/**
 * Usage in API/Chat Route:
 *
 * ```ts
 * import { routerAgent } from '@/services/ai/agents';
 *
 * export const router = express.Router();
 *
 * router.post('/chat', async (req, res) => {
 *   const { userId, messages } = req.body;
 *
 *   // Stream the router agent response
 *   const result = routerAgent.stream({
 *     messages,
 *   });
 *
 *   // For streaming response:
 *   res.setHeader('Content-Type', 'text/event-stream');
 *   for await (const part of result.textStream) {
 *     res.write(`data: ${JSON.stringify(part)}\n\n`);
 *   }
 *   res.end();
 * });
 * ```
 */
