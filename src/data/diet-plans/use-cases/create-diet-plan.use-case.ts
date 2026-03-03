import {
  dietPlanService,
  type DietPlanService,
} from "../service/diet-plan.service";
import {
  CreateDietPlanSchema,
  type CreateDietPlanInput,
  type DietPlanDto,
} from "../models/diet-plan.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class CreateDietPlanUseCase extends UseCase<
  CreateDietPlanInput,
  DietPlanDto
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: DietPlanService = dietPlanService,
  ) {
    super();
  }

  static validate(input: unknown): CreateDietPlanInput {
    return CreateDietPlanSchema.parse(input);
  }

  protected async run(input: CreateDietPlanInput): Promise<DietPlanDto> {
    return this.service.create(input, this.dependentId);
  }
}
