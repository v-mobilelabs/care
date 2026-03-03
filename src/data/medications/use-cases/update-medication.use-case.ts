import {
  medicationService,
  type MedicationService,
} from "../service/medication.service";
import {
  UpdateMedicationSchema,
  type UpdateMedicationInput,
  type MedicationDto,
} from "../models/medication.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class UpdateMedicationUseCase extends UseCase<
  UpdateMedicationInput,
  MedicationDto
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: MedicationService = medicationService,
  ) {
    super();
  }

  static validate(input: unknown): UpdateMedicationInput {
    return UpdateMedicationSchema.parse(input);
  }

  protected async run(input: UpdateMedicationInput): Promise<MedicationDto> {
    return this.service.update(input, this.dependentId);
  }
}
