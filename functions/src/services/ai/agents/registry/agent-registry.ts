/**
 * Specialist Agent Registry
 *
 * Lazy singleton map: Specialty → ToolLoopAgent.
 * Each specialist agent is initialized on first use and reused across requests.
 *
 * Model tier is driven by SPECIALTY_META — 'pro' for high-stakes clinical
 * decisions, 'fast' for interpretive/structural queries.
 *
 * All agents stream character-by-character and send UI feedback during processing.
 */

import { ToolLoopAgent, stepCountIs, pruneMessages } from "ai";
import { getModel } from "@/lib/model.js";
import { Specialty, SPECIALTY_META } from "./specialty.enum.js";
import { getSpecialistPrompt } from "../specialists/index.js";
import { buildSharedTools } from "../shared-tools.js";

const _registry = new Map<Specialty, ToolLoopAgent>();

/**
 * Return the ToolLoopAgent for the given specialty.
 * Creates and caches on first call; subsequent calls return the same instance.
 * Shared tools (memory, etc.) are injected at request time via contextId.
 *
 * @param specialty - Medical specialty
 * @param contextId - Optional context ID for shared tools like memory
 */
export function getSpecialistAgent(
  specialty: Specialty,
  contextId?: string
): ToolLoopAgent {
  if (!_registry.has(specialty)) {
    const meta = SPECIALTY_META[specialty];

    let tools = {};
    if (contextId) {
      tools = buildSharedTools(contextId);
    }

    const agent = new ToolLoopAgent({
      model: getModel(meta.model),
      instructions: getSpecialistPrompt(specialty),
      tools,
      stopWhen: stepCountIs(8),
      prepareStep: ({ messages }) => ({
        messages: pruneMessages({ messages }),
      }),
    });

    _registry.set(specialty, agent);
  }

  return _registry.get(specialty)!;
}

/**
 * Reset the entire registry — useful for testing or hot-reload scenarios.
 */
export function resetRegistry(): void {
  _registry.clear();
}
