import { prescriptionRepository } from "../repositories/prescription.repository";
import type {
  PrescriptionDto,
  ListPrescriptionsInput,
  PrescriptionRefInput,
} from "../models/prescription.model";

export class PrescriptionService {
  async list(
    input: ListPrescriptionsInput,
    dependentId?: string,
  ): Promise<PrescriptionDto[]> {
    return prescriptionRepository.list(input.userId, input.limit, dependentId);
  }

  async getById(
    input: PrescriptionRefInput,
    dependentId?: string,
  ): Promise<PrescriptionDto | null> {
    return prescriptionRepository.findById(
      input.userId,
      input.prescriptionId,
      dependentId,
    );
  }

  async delete(
    input: PrescriptionRefInput,
    dependentId?: string,
  ): Promise<void> {
    await prescriptionRepository.delete(
      input.userId,
      input.prescriptionId,
      dependentId,
    );
  }
}

export const prescriptionService = new PrescriptionService();
