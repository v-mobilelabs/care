import {
  conditionService,
  type ConditionService,
} from "../service/condition.service";
import {
  CreateConditionSchema,
  type CreateConditionInput,
  type ConditionDto,
} from "../models/condition.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class CreateConditionUseCase extends UseCase<
  CreateConditionInput,
  ConditionDto
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: ConditionService = conditionService,
  ) {
    super();
  }

  static validate(input: unknown): CreateConditionInput {
    return CreateConditionSchema.parse(input);
  }

  protected async run(input: CreateConditionInput): Promise<ConditionDto> {
    return this.service.create(input, this.dependentId);
  }
}
