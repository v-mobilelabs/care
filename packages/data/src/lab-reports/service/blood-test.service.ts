import { bloodTestRepository } from "../repositories/blood-test.repository";
import type {
  BloodTestDto,
  ListBloodTestsInput,
  BloodTestRefInput,
} from "../models/blood-test.model";

export class BloodTestService {
  async list(input: ListBloodTestsInput): Promise<BloodTestDto[]> {
    return bloodTestRepository.list(input.userId, input.limit);
  }

  async getById(input: BloodTestRefInput): Promise<BloodTestDto | null> {
    return bloodTestRepository.findById(input.userId, input.bloodTestId);
  }

  async delete(input: BloodTestRefInput): Promise<void> {
    await bloodTestRepository.delete(input.userId, input.bloodTestId);
  }
}

export const bloodTestService = new BloodTestService();
