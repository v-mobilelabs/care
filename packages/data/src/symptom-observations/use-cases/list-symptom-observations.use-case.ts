import {
  symptomObservationService,
  type SymptomObservationService,
} from "../service/symptom-observation.service";
import {
  ListSymptomObservationsSchema,
  type ListSymptomObservationsInput,
  type PaginatedSymptomObservations,
} from "../models/symptom-observation.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ListSymptomObservationsUseCase extends UseCase<
  ListSymptomObservationsInput,
  PaginatedSymptomObservations
> {
  constructor(
    private readonly service: SymptomObservationService = symptomObservationService,
  ) {
    super();
  }

  static validate(input: unknown): ListSymptomObservationsInput {
    return ListSymptomObservationsSchema.parse(input);
  }

  protected async run(
    input: ListSymptomObservationsInput,
  ): Promise<PaginatedSymptomObservations> {
    return this.service.listPaginated(input);
  }
}
