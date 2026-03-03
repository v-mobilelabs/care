import {
  sessionService,
  type SessionService,
} from "../service/session.service";
import {
  SessionRefSchema,
  type SessionRefInput,
  type SessionDto,
} from "../models/session.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class GetSessionUseCase extends UseCase<
  SessionRefInput,
  SessionDto | null
> {
  constructor(private readonly service: SessionService = sessionService) {
    super();
  }

  static validate(input: unknown): SessionRefInput {
    return SessionRefSchema.parse(input);
  }

  protected async run(input: SessionRefInput): Promise<SessionDto | null> {
    return this.service.getById(input);
  }
}
