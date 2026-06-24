import {
  symptomObservationService,
  type SymptomObservationService,
} from "../service/symptom-observation.service";
import {
  CreateSymptomObservationSchema,
  type CreateSymptomObservationInput,
  type SymptomObservationDto,
} from "../models/symptom-observation.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { Indexable } from "@/data/shared/use-cases/indexable.decorator";

@Indexable({
  type: "symptom-observation",
  contentFields: ["symptom", "notes", "duration", "onset", "state"],
  sourceIdField: "id",
  metadataFields: [
    "source",
    "severity",
    "state",
    "conditionId",
    "observedAt",
    "recordedAt",
  ],
})
export class CreateSymptomObservationUseCase extends UseCase<
  CreateSymptomObservationInput,
  SymptomObservationDto
> {
  constructor(
    private readonly service: SymptomObservationService = symptomObservationService,
  ) {
    super();
  }

  static validate(input: unknown): CreateSymptomObservationInput {
    return CreateSymptomObservationSchema.parse(input);
  }

  protected async run(
    input: CreateSymptomObservationInput,
  ): Promise<SymptomObservationDto> {
    return this.service.create(input);
  }
}
