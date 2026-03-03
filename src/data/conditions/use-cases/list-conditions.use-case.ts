import {
  conditionService,
  type ConditionService,
} from "../service/condition.service";
import {
  ListConditionsSchema,
  type ListConditionsInput,
  type ConditionDto,
} from "../models/condition.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ListConditionsUseCase extends UseCase<
  ListConditionsInput,
  ConditionDto[]
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: ConditionService = conditionService,
  ) {
    super();
  }

  static validate(input: unknown): ListConditionsInput {
    return ListConditionsSchema.parse(input);
  }

  protected async run(input: ListConditionsInput): Promise<ConditionDto[]> {
    return this.service.list(input, this.dependentId);
  }
}
