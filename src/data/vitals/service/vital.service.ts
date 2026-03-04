import { vitalRepository } from "../repositories/vital.repository";
import type {
  CreateVitalInput,
  ListVitalsInput,
  VitalRefInput,
  VitalDto,
} from "../models/vital.model";

export class VitalService {
  async create(
    input: CreateVitalInput,
    dependentId?: string,
  ): Promise<VitalDto> {
    return vitalRepository.create(input.userId, input, dependentId);
  }

  async list(
    input: ListVitalsInput,
    dependentId?: string,
  ): Promise<VitalDto[]> {
    return vitalRepository.list(input.userId, input.limit, dependentId);
  }

  async getById(
    input: VitalRefInput,
    dependentId?: string,
  ): Promise<VitalDto | null> {
    return vitalRepository.findById(input.userId, input.vitalId, dependentId);
  }

  async delete(input: VitalRefInput, dependentId?: string): Promise<void> {
    await vitalRepository.delete(input.userId, input.vitalId, dependentId);
  }
}

export const vitalService = new VitalService();
