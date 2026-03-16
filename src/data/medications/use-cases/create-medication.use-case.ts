import {
  medicationService,
  type MedicationService,
} from "../service/medication.service";
import {
  CreateMedicationSchema,
  type CreateMedicationInput,
  type MedicationDto,
} from "../models/medication.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { Indexable } from "@/data/shared/use-cases/indexable.decorator";

@Indexable({
  type: "medication",
  contentFields: [
    "name",
    "status",
    "dosage",
    "form",
    "frequency",
    "duration",
    "condition",
    "instructions",
    "createdAt",
  ],
  sourceIdField: "id",
  metadataFields: ["status", "createdAt"],
})
export class CreateMedicationUseCase extends UseCase<
  CreateMedicationInput,
  MedicationDto
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: MedicationService = medicationService,
  ) {
    super();
  }

  static validate(input: unknown): CreateMedicationInput {
    return CreateMedicationSchema.parse(input);
  }

  protected async run(input: CreateMedicationInput): Promise<MedicationDto> {
    return this.service.create(input, this.dependentId);
  }
}
