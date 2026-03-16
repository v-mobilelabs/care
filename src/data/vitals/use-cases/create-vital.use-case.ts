import { vitalRepository } from "../repositories/vital.repository";
import {
  CreateVitalSchema,
  type CreateVitalInput,
  type VitalDto,
} from "../models/vital.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { Indexable } from "@/data/shared/use-cases/indexable.decorator";

@Indexable({
  type: "vital",
  contentFields: [
    "systolicBp",
    "diastolicBp",
    "restingHr",
    "temperatureC",
    "spo2",
    "respiratoryRate",
    "glucoseMmol",
    "waistCm",
    "hipCm",
    "neckCm",
    "note",
    "createdAt",
  ],
  sourceIdField: "id",
  metadataFields: ["createdAt"],
})
export class CreateVitalUseCase extends UseCase<CreateVitalInput, VitalDto> {
  constructor(private readonly dependentId?: string) {
    super();
  }

  static validate(input: unknown): CreateVitalInput {
    return CreateVitalSchema.parse(input);
  }

  protected async run(input: CreateVitalInput): Promise<VitalDto> {
    return vitalRepository.create(input.userId, input, this.dependentId);
  }
}
