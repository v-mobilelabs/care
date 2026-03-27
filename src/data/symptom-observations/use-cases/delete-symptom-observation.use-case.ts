import {
  symptomObservationService,
  type SymptomObservationService,
} from "../service/symptom-observation.service";
import {
  DeleteSymptomObservationSchema,
  type DeleteSymptomObservationInput,
} from "../models/symptom-observation.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { Indexable } from "@/data/shared/use-cases/indexable.decorator";

@Indexable({ sourceIdField: "observationId", remove: true })
export class DeleteSymptomObservationUseCase extends UseCase<
  DeleteSymptomObservationInput,
  void
> {
  constructor(
    private readonly service: SymptomObservationService = symptomObservationService,
  ) {
    super();
  }

  static validate(input: unknown): DeleteSymptomObservationInput {
    return DeleteSymptomObservationSchema.parse(input);
  }

  protected async run(input: DeleteSymptomObservationInput): Promise<void> {
    await this.service.delete(input);
  }
}
