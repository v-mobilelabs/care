import {
  sessionService,
  type SessionService,
} from "../service/session.service";
import {
  CreateSessionSchema,
  type CreateSessionInput,
  type SessionDto,
} from "../models/session.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class CreateSessionUseCase extends UseCase<
  CreateSessionInput,
  SessionDto
> {
  constructor(
    private readonly dependentId: string | undefined = undefined,
    private readonly service: SessionService = sessionService,
  ) {
    super();
  }

  static validate(input: unknown): CreateSessionInput {
    return CreateSessionSchema.parse(input);
  }

  protected async run(input: CreateSessionInput): Promise<SessionDto> {
    return this.service.create({
      ...input,
      dependentId: input.dependentId ?? this.dependentId,
    });
  }
}
