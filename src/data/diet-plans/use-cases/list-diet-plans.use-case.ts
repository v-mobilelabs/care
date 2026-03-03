import {
  dietPlanService,
  type DietPlanService,
} from "../service/diet-plan.service";
import {
  ListDietPlansSchema,
  type ListDietPlansInput,
  type DietPlanDto,
} from "../models/diet-plan.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ListDietPlansUseCase extends UseCase<
  ListDietPlansInput,
  DietPlanDto[]
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: DietPlanService = dietPlanService,
  ) {
    super();
  }

  static validate(input: unknown): ListDietPlansInput {
    return ListDietPlansSchema.parse(input);
  }

  protected async run(input: ListDietPlansInput): Promise<DietPlanDto[]> {
    return this.service.list(input, this.dependentId);
  }
}
