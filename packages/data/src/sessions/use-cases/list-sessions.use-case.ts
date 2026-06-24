import {
  sessionService,
  type SessionService,
} from "../service/session.service";
import {
  ListSessionsSchema,
  type ListSessionsInput,
  type SessionDto,
} from "../models/session.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ListSessionsUseCase extends UseCase<
  ListSessionsInput,
  SessionDto[]
> {
  constructor(private readonly service: SessionService = sessionService) {
    super();
  }

  static validate(input: unknown): ListSessionsInput {
    return ListSessionsSchema.parse(input);
  }

  protected async run(input: ListSessionsInput): Promise<SessionDto[]> {
    return this.service.list(input);
  }
}
