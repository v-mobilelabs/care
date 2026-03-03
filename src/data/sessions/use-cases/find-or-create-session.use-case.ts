import { z } from "zod";
import {
  sessionService,
  type SessionService,
} from "../service/session.service";
import type { SessionDto } from "../models/session.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

const FindOrCreateSessionSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  dependentId: z.string().optional(),
  sessionId: z.string().min(1, { message: "sessionId is required" }),
  title: z.string().min(1).max(120).optional().default("New Session"),
});

type FindOrCreateSessionInput = z.infer<typeof FindOrCreateSessionSchema>;

export class FindOrCreateSessionUseCase extends UseCase<
  FindOrCreateSessionInput,
  SessionDto
> {
  constructor(private readonly service: SessionService = sessionService) {
    super();
  }

  static validate(input: unknown): FindOrCreateSessionInput {
    return FindOrCreateSessionSchema.parse(input);
  }

  protected async run(input: FindOrCreateSessionInput): Promise<SessionDto> {
    return this.service.findOrCreate(
      input.userId,
      input.sessionId,
      input.title,
      input.dependentId,
    );
  }
}
