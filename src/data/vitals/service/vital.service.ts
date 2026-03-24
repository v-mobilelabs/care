import { vitalRepository } from "../repositories/vital.repository";
import type {
  CreateVitalInput,
  ListVitalsInput,
  VitalRefInput,
  VitalDto,
} from "../models/vital.model";

export class VitalService {
  async create(input: CreateVitalInput): Promise<VitalDto> {
    return vitalRepository.create(input.userId, input);
  }

  async list(input: ListVitalsInput): Promise<VitalDto[]> {
    return vitalRepository.list(input.userId, input.limit);
  }

  async getById(input: VitalRefInput): Promise<VitalDto | null> {
    return vitalRepository.findById(input.userId, input.vitalId);
  }

  async delete(input: VitalRefInput): Promise<void> {
    await vitalRepository.delete(input.userId, input.vitalId);
  }
}

export const vitalService = new VitalService();
