import { insuranceRepository } from "../repositories/insurance.repository";
import type {
  CreateInsuranceInput,
  UpdateInsuranceInput,
  DeleteInsuranceInput,
  ListInsuranceInput,
  InsuranceDto,
} from "../models/insurance.model";

export class InsuranceService {
  async create(
    input: CreateInsuranceInput,
    dependentId?: string,
  ): Promise<InsuranceDto> {
    const { userId, ...rest } = input;
    return insuranceRepository.create(userId, dependentId, {
      ...rest,
      type: rest.type ?? "health",
    });
  }

  async list(
    input: ListInsuranceInput,
    dependentId?: string,
  ): Promise<InsuranceDto[]> {
    return insuranceRepository.list(input.userId, input.limit, dependentId);
  }

  async update(
    input: UpdateInsuranceInput,
    dependentId?: string,
  ): Promise<InsuranceDto> {
    const { userId, insuranceId, ...rest } = input;
    return insuranceRepository.update(userId, insuranceId, rest, dependentId);
  }

  async delete(
    input: DeleteInsuranceInput,
    dependentId?: string,
  ): Promise<void> {
    await insuranceRepository.delete(
      input.userId,
      input.insuranceId,
      dependentId,
    );
  }

  async uploadDocument(
    userId: string,
    insuranceId: string,
    file: { name: string; mimeType: string; buffer: Buffer },
    dependentId?: string,
  ): Promise<InsuranceDto> {
    return insuranceRepository.uploadDocument(
      userId,
      insuranceId,
      file,
      dependentId,
    );
  }
}

export const insuranceService = new InsuranceService();
