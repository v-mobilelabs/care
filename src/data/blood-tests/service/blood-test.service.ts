import { bloodTestRepository } from "../repositories/blood-test.repository";
import type {
  BloodTestDto,
  ListBloodTestsInput,
  BloodTestRefInput,
} from "../models/blood-test.model";

export class BloodTestService {
  async list(
    input: ListBloodTestsInput,
    dependentId?: string,
  ): Promise<BloodTestDto[]> {
    return bloodTestRepository.list(input.userId, input.limit, dependentId);
  }

  async getById(
    input: BloodTestRefInput,
    dependentId?: string,
  ): Promise<BloodTestDto | null> {
    return bloodTestRepository.findById(
      input.userId,
      input.bloodTestId,
      dependentId,
    );
  }

  async delete(input: BloodTestRefInput, dependentId?: string): Promise<void> {
    await bloodTestRepository.delete(
      input.userId,
      input.bloodTestId,
      dependentId,
    );
  }
}

export const bloodTestService = new BloodTestService();
