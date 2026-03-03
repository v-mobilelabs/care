import {
  medicationService,
  type MedicationService,
} from "../service/medication.service";
import {
  ListMedicationsSchema,
  type ListMedicationsInput,
  type MedicationDto,
} from "../models/medication.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ListMedicationsUseCase extends UseCase<
  ListMedicationsInput,
  MedicationDto[]
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: MedicationService = medicationService,
  ) {
    super();
  }

  static validate(input: unknown): ListMedicationsInput {
    return ListMedicationsSchema.parse(input);
  }

  protected async run(input: ListMedicationsInput): Promise<MedicationDto[]> {
    return this.service.list(input, this.dependentId);
  }
}
