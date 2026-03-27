import { z } from "zod";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { sessionRepository } from "../repositories/session.repository";

const GroundingEvaluationSchema = z.object({
  stage: z.enum(["initial", "internal-repair", "web-fallback", "failed"]),
  reason: z.string().min(1),
  scores: z.object({
    relevance: z.number().min(0).max(1),
    grounding: z.number().min(0).max(1),
    coverage: z.number().min(0).max(1),
    freshness: z.number().min(0).max(1),
    sourceTrust: z.number().min(0).max(1),
  }),
});

const SetSessionGroundingSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  profileId: z.string().min(1, { message: "profileId is required" }),
  sessionId: z.string().min(1, { message: "sessionId is required" }),
  agentType: z.string().min(1, { message: "agentType is required" }),
  query: z.string().min(1, { message: "query is required" }),
  normalizedQuery: z
    .string()
    .min(1, { message: "normalizedQuery is required" }),
  queryEmbedding: z.array(z.number()).optional(),
  context: z.string().min(1, { message: "context is required" }),
  responseMode: z.enum(["quick", "full"]),
  hasAttachment: z.boolean().optional(),
  evaluation: GroundingEvaluationSchema.optional(),
});

export type SetSessionGroundingInput = z.infer<
  typeof SetSessionGroundingSchema
>;

export class SetSessionGroundingUseCase extends UseCase<
  SetSessionGroundingInput,
  void
> {
  static validate(input: unknown): SetSessionGroundingInput {
    return SetSessionGroundingSchema.parse(input);
  }

  protected async run(input: SetSessionGroundingInput): Promise<void> {
    await sessionRepository.setGroundingCache(
      input.userId,
      input.profileId,
      input.sessionId,
      {
        agentType: input.agentType,
        query: input.query,
        normalizedQuery: input.normalizedQuery,
        queryEmbedding: input.queryEmbedding,
        context: input.context,
        responseMode: input.responseMode,
        hasAttachment: input.hasAttachment,
        evaluation: input.evaluation,
      },
    );
  }
}
