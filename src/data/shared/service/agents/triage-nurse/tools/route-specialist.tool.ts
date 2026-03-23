import { tool } from "ai";
import { z } from "zod";
import { SetSessionAgentUseCase } from "@/data/sessions";
import type { AgentCallOptions } from "@/data/shared/service/agents/base/agent";

const ROUTABLE_SPECIALISTS = [
  "generalMedicine",
  "neurology",
  "cardiology",
  "mentalHealth",
  "dermatology",
  "pediatrics",
  "womensHealth",
  "orthopedics",
  "gastroenterology",
  "endocrinology",
  "urology",
  "radiology",
  "dentistry",
  "nutrition",
  "immunology",
  "ent",
  "ophthalmology",
  "nephrology",
  "prescription",
  "labReport",
  "dietPlanner",
  "patient",
] as const;

export type RoutableSpecialist = (typeof ROUTABLE_SPECIALISTS)[number];

const routeSpecialistInputSchema = z.object({
  specialist: z
    .enum(ROUTABLE_SPECIALISTS)
    .describe("Specialist agent that should own subsequent turns"),
  reason: z
    .string()
    .min(3)
    .max(300)
    .optional()
    .describe("Short handoff rationale based on triage answers"),
});

async function persistSpecialistRoute(
  options: AgentCallOptions,
  specialist: RoutableSpecialist,
): Promise<void> {
  await new SetSessionAgentUseCase().execute({
    userId: options.userId,
    profileId: options.profileId,
    sessionId: options.sessionId,
    agentType: specialist,
  });
}

/**
 * Triage handoff tool: persist the chosen specialist on the session so
 * subsequent turns route directly to that specialty instead of staying in triage.
 */
export function createRouteSpecialistTool(options: AgentCallOptions) {
  return tool({
    description:
      "Route handoff to a specialist after triage questions. " +
      "Call this exactly once after you identify the best specialty.",
    inputSchema: routeSpecialistInputSchema,
    execute: async ({ specialist, reason }) => {
      await persistSpecialistRoute(options, specialist);

      return {
        ok: true,
        specialist,
        reason: reason ?? "Triage handoff completed",
      };
    },
  });
}
