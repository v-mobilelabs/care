import {
  medicationService,
  type MedicationService,
} from "../service/medication.service";
import {
  DeleteMedicationSchema,
  type DeleteMedicationInput,
} from "../models/medication.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class DeleteMedicationUseCase extends UseCase<
  DeleteMedicationInput,
  void
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: MedicationService = medicationService,
  ) {
    super();
  }

  static validate(input: unknown): DeleteMedicationInput {
    return DeleteMedicationSchema.parse(input);
  }

  protected async run(input: DeleteMedicationInput): Promise<void> {
    await this.service.delete(input, this.dependentId);
  }
}
