import {
  sessionService,
  type SessionService,
} from "../service/session.service";
import {
  SessionRefSchema,
  type SessionRefInput,
} from "../models/session.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class DeleteSessionUseCase extends UseCase<SessionRefInput, void> {
  constructor(private readonly service: SessionService = sessionService) {
    super();
  }

  static validate(input: unknown): SessionRefInput {
    return SessionRefSchema.parse(input);
  }

  protected async run(input: SessionRefInput): Promise<void> {
    return this.service.delete(input);
  }
}
