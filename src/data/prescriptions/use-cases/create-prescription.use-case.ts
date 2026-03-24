import { prescriptionRepository } from "../repositories/prescription.repository";
import {
  CreatePrescriptionSchema,
  type CreatePrescriptionInput,
  type PrescriptionDto,
} from "../models/prescription.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class CreatePrescriptionUseCase extends UseCase<
  CreatePrescriptionInput,
  PrescriptionDto
> {
  static validate(input: unknown): CreatePrescriptionInput {
    return CreatePrescriptionSchema.parse(input);
  }

  protected async run(
    input: CreatePrescriptionInput,
  ): Promise<PrescriptionDto> {
    const { userId, profileId, ...data } = input;

    return prescriptionRepository.create(userId, {
      ...data,
      medications: data.medications.map((m) => ({
        ...m,
        form: m.form,
      })),
    });
  }
}
