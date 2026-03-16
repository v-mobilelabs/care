import { vitalRepository } from "../repositories/vital.repository";
import {
  VitalRefSchema,
  type VitalRefInput,
  type VitalDto,
} from "../models/vital.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class GetVitalUseCase extends UseCase<VitalRefInput, VitalDto | null> {
  constructor(private readonly dependentId?: string) {
    super();
  }

  static validate(input: unknown): VitalRefInput {
    return VitalRefSchema.parse(input);
  }

  protected async run(input: VitalRefInput): Promise<VitalDto | null> {
    return vitalRepository.findById(
      input.userId,
      input.vitalId,
      this.dependentId,
    );
  }
}
