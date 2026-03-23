import {
  conditionService,
  type ConditionService,
} from "../service/condition.service";
import {
  DeleteConditionSchema,
  type DeleteConditionInput,
} from "../models/condition.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class DeleteConditionUseCase extends UseCase<
  DeleteConditionInput,
  void
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: ConditionService = conditionService,
  ) {
    super();
  }

  static validate(input: unknown): DeleteConditionInput {
    return DeleteConditionSchema.parse(input);
  }

  protected async run(input: DeleteConditionInput): Promise<void> {
    await this.service.delete(input, this.dependentId);
  }
}
