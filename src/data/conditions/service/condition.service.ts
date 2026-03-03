import { conditionRepository } from "../repositories/condition.repository";
import type {
  CreateConditionInput,
  ListConditionsInput,
  DeleteConditionInput,
  ConditionDto,
} from "../models/condition.model";

export class ConditionService {
  async create(
    input: CreateConditionInput,
    dependentId?: string,
  ): Promise<ConditionDto> {
    return conditionRepository.create(
      input.userId,
      {
        sessionId: input.sessionId,
        name: input.name,
        icd10: input.icd10,
        severity: input.severity,
        status: input.status,
        description: input.description,
        symptoms: input.symptoms,
      },
      dependentId,
    );
  }

  async list(
    input: ListConditionsInput,
    dependentId?: string,
  ): Promise<ConditionDto[]> {
    return conditionRepository.list(input.userId, input.limit, dependentId);
  }

  async delete(
    input: DeleteConditionInput,
    dependentId?: string,
  ): Promise<void> {
    await conditionRepository.delete(
      input.userId,
      input.conditionId,
      dependentId,
    );
  }
}

export const conditionService = new ConditionService();
