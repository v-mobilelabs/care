import { medicationRepository } from "../repositories/medication.repository";
import type {
  CreateMedicationInput,
  ListMedicationsInput,
  UpdateMedicationInput,
  DeleteMedicationInput,
  MedicationDto,
} from "../models/medication.model";

export class MedicationService {
  async create(input: CreateMedicationInput): Promise<MedicationDto> {
    return medicationRepository.create(input.userId, {
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

  async list(input: ListMedicationsInput): Promise<MedicationDto[]> {
    return medicationRepository.list(input.userId, input.limit);
  }

  async update(input: UpdateMedicationInput): Promise<MedicationDto> {
    const { userId, medicationId, ...rest } = input;
    return medicationRepository.update(userId, medicationId, rest);
  }

  async delete(input: DeleteMedicationInput): Promise<void> {
    await medicationRepository.delete(input.userId, input.medicationId);
  }
}

export const medicationService = new MedicationService();
