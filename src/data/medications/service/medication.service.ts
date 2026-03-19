import { medicationRepository } from "../repositories/medication.repository";
import type {
  CreateMedicationInput,
  ListMedicationsInput,
  UpdateMedicationInput,
  DeleteMedicationInput,
  MedicationDto,
} from "../models/medication.model";

export class MedicationService {
  async create(
    input: CreateMedicationInput,
    dependentId?: string,
  ): Promise<MedicationDto> {
    return medicationRepository.create(input.userId, dependentId, {
      sessionId: input.sessionId,
      prescriptionId: input.prescriptionId,
      name: input.name,
      dosage: input.dosage,
      form: input.form,
      frequency: input.frequency,
      duration: input.duration,
      instructions: input.instructions,
      condition: input.condition,
      status: input.status,
    });
  }

  async list(
    input: ListMedicationsInput,
    dependentId?: string,
  ): Promise<MedicationDto[]> {
    return medicationRepository.list(input.userId, input.limit, dependentId);
  }

  async update(
    input: UpdateMedicationInput,
    dependentId?: string,
  ): Promise<MedicationDto> {
    const { userId, medicationId, ...rest } = input;
    return medicationRepository.update(userId, medicationId, rest, dependentId);
  }

  async delete(
    input: DeleteMedicationInput,
    dependentId?: string,
  ): Promise<void> {
    await medicationRepository.delete(
      input.userId,
      input.medicationId,
      dependentId,
    );
  }
}

export const medicationService = new MedicationService();
