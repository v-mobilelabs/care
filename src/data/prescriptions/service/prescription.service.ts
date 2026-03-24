import { prescriptionRepository } from "../repositories/prescription.repository";
import { ragService } from "@/data/shared/service/rag/rag.service";
import type {
  PrescriptionDto,
  ListPrescriptionsInput,
  PrescriptionRefInput,
} from "../models/prescription.model";

export class PrescriptionService {
  async list(input: ListPrescriptionsInput): Promise<PrescriptionDto[]> {
    return prescriptionRepository.list(input.userId, input.limit);
  }

  async getById(input: PrescriptionRefInput): Promise<PrescriptionDto | null> {
    return prescriptionRepository.findById(input.userId, input.prescriptionId);
  }

  async delete(input: PrescriptionRefInput): Promise<void> {
    await prescriptionRepository.delete(input.userId, input.prescriptionId);
  }

  /** Find by source file ID, then delete the prescription + remove from RAG index. */
  async deleteByFileId(
    userId: string,
    profileId: string,
    fileId: string,
  ): Promise<void> {
    const prescription = await prescriptionRepository.findByFileId(
      userId,
      fileId,
    );
    if (!prescription) return;

    await Promise.all([
      prescriptionRepository.delete(userId, prescription.id),
      ragService.removeDocument({
        userId,
        profileId,
        sourceId: prescription.id,
      }),
    ]);
  }
}

export const prescriptionService = new PrescriptionService();
