import {
  sessionService,
  type SessionService,
} from "../service/session.service";
import {
  UpdateSessionSchema,
  type UpdateSessionInput,
  type SessionDto,
} from "../models/session.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class UpdateSessionUseCase extends UseCase<
  UpdateSessionInput,
  SessionDto | null
> {
  constructor(private readonly service: SessionService = sessionService) {
    super();
  }

  static validate(input: unknown): UpdateSessionInput {
    return UpdateSessionSchema.parse(input);
  }

  protected async run(input: UpdateSessionInput): Promise<SessionDto | null> {
    return this.service.update(input);
  }
}
