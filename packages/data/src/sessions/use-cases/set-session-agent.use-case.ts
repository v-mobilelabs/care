import { z } from "zod";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { sessionRepository } from "../repositories/session.repository";

const SetSessionAgentSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  profileId: z.string().min(1, { message: "profileId is required" }),
  sessionId: z.string().min(1, { message: "sessionId is required" }),
  agentType: z.string().min(1, { message: "agentType is required" }),
});

export type SetSessionAgentInput = z.infer<typeof SetSessionAgentSchema>;

export class SetSessionAgentUseCase extends UseCase<
  SetSessionAgentInput,
  void
> {
  static validate(input: unknown): SetSessionAgentInput {
    return SetSessionAgentSchema.parse(input);
  }

  protected async run(input: SetSessionAgentInput): Promise<void> {
    await sessionRepository.setLastAgentType(
      input.userId,
      input.profileId,
      input.sessionId,
      input.agentType,
    );
  }
}
