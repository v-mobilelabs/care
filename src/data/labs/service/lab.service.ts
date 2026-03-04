import { labRepository } from "../repositories/lab.repository";
import type {
  CreateLabInput,
  ListLabsInput,
  LabRefInput,
  LabDto,
} from "../models/lab.model";

export class LabService {
  async create(input: CreateLabInput, dependentId?: string): Promise<LabDto> {
    return labRepository.create(input.userId, input, dependentId);
  }

  async list(input: ListLabsInput, dependentId?: string): Promise<LabDto[]> {
    return labRepository.list(input.userId, input.limit, dependentId);
  }

  async getById(
    input: LabRefInput,
    dependentId?: string,
  ): Promise<LabDto | null> {
    return labRepository.findById(input.userId, input.labId, dependentId);
  }

  async delete(input: LabRefInput, dependentId?: string): Promise<void> {
    await labRepository.delete(input.userId, input.labId, dependentId);
  }
}

export const labService = new LabService();
