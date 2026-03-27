import {
  medicationService,
  type MedicationService,
} from "../service/medication.service";
import {
  ListMedicationsPaginatedSchema,
  type ListMedicationsPaginatedInput,
  type PaginatedMedications,
} from "../models/medication.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ListMedicationsPaginatedUseCase extends UseCase<
  ListMedicationsPaginatedInput,
  PaginatedMedications
> {
  constructor(private readonly service: MedicationService = medicationService) {
    super();
  }

  static validate(input: unknown): ListMedicationsPaginatedInput {
    return ListMedicationsPaginatedSchema.parse(input);
  }

  protected async run(
    input: ListMedicationsPaginatedInput,
  ): Promise<PaginatedMedications> {
    return this.service.listPaginated(input);
  }
}
