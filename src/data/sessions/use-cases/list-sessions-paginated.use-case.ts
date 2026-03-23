import {
  sessionService,
  type SessionService,
} from "../service/session.service";
import {
  ListSessionsPaginatedSchema,
  type ListSessionsPaginatedInput,
  type PaginatedSessions,
} from "../models/session.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ListSessionsPaginatedUseCase extends UseCase<
  ListSessionsPaginatedInput,
  PaginatedSessions
> {
  constructor(private readonly service: SessionService = sessionService) {
    super();
  }

  static validate(input: unknown): ListSessionsPaginatedInput {
    return ListSessionsPaginatedSchema.parse(input);
  }

  protected async run(
    input: ListSessionsPaginatedInput,
  ): Promise<PaginatedSessions> {
    return this.service.listPaginated(input);
  }
}
