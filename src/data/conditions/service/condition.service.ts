import { conditionRepository } from "../repositories/condition.repository";
import type {
  CreateConditionInput,
  ListConditionsInput,
  DeleteConditionInput,
  ConditionDto,
} from "../models/condition.model";

export class ConditionService {
  async create(input: CreateConditionInput): Promise<ConditionDto> {
    return conditionRepository.create(input.userId, {
      sessionId: input.sessionId,
      name: input.name,
      icd10: input.icd10,
      severity: input.severity,
      status: input.status,
      description: input.description,
      symptoms: input.symptoms,
    });
  }

  async list(input: ListConditionsInput): Promise<ConditionDto[]> {
    return conditionRepository.list(input.userId, input.limit);
  }

  async delete(input: DeleteConditionInput): Promise<void> {
    await conditionRepository.delete(input.userId, input.conditionId);
  }
}

export const conditionService = new ConditionService();
