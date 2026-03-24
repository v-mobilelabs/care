import { dietPlanRepository } from "../repositories/diet-plan.repository";
import type {
  CreateDietPlanInput,
  ListDietPlansInput,
  DeleteDietPlanInput,
  DietPlanDto,
} from "../models/diet-plan.model";

export class DietPlanService {
  private buildData(
    input: Omit<CreateDietPlanInput, "userId">,
  ): Omit<
    import("../models/diet-plan.model").DietPlanDocument,
    "userId" | "createdAt"
  > {
    return {
      sessionId: input.sessionId,
      condition: input.condition,
      overview: input.overview,
      weeklyWeightLossEstimate: input.weeklyWeightLossEstimate,
      totalDailyCalories: input.totalDailyCalories,
      weeklyPlan: input.weeklyPlan,
      recommended: input.recommended,
      avoid: input.avoid,
      tips: input.tips,
    };
  }

  async create(input: CreateDietPlanInput): Promise<DietPlanDto> {
    const { userId, ...rest } = input;
    if (rest.sessionId) {
      return dietPlanRepository.upsertBySession(
        userId,
        rest.sessionId,
        this.buildData(rest),
      );
    }
    return dietPlanRepository.create(userId, this.buildData(rest));
  }

  async list(input: ListDietPlansInput): Promise<DietPlanDto[]> {
    return dietPlanRepository.list(input.userId, input.limit);
  }

  async delete(input: DeleteDietPlanInput): Promise<void> {
    await dietPlanRepository.delete(input.userId, input.planId);
  }
}

export const dietPlanService = new DietPlanService();
