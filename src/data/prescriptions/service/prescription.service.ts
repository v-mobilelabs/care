import { prescriptionRepository } from "../repositories/prescription.repository";
import { ragService } from "@/data/shared/service/rag/rag.service";
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

  /** Find by source file ID, then delete the prescription + remove from RAG index. */
  async deleteByFileId(
    userId: string,
    profileId: string,
    fileId: string,
    dependentId?: string,
  ): Promise<void> {
    const prescription = await prescriptionRepository.findByFileId(
      userId,
      fileId,
      dependentId,
    );
    if (!prescription) return;

    await Promise.all([
      prescriptionRepository.delete(userId, prescription.id, dependentId),
      ragService.removeDocument({
        userId,
        profileId,
        sourceId: prescription.id,
      }),
    ]);
  }
}

export const prescriptionService = new PrescriptionService();
