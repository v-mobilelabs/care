import {
  dietPlanService,
  type DietPlanService,
} from "../service/diet-plan.service";
import {
  DeleteDietPlanSchema,
  type DeleteDietPlanInput,
} from "../models/diet-plan.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class DeleteDietPlanUseCase extends UseCase<DeleteDietPlanInput, void> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: DietPlanService = dietPlanService,
  ) {
    super();
  }

  static validate(input: unknown): DeleteDietPlanInput {
    return DeleteDietPlanSchema.parse(input);
  }

  protected async run(input: DeleteDietPlanInput): Promise<void> {
    await this.service.delete(input, this.dependentId);
  }
}
