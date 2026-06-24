import {
  patientSummaryService,
  type PatientSummaryService,
} from "../service/patient-summary.service";
import {
  PatchPatientSummarySchema,
  type PatchPatientSummaryInput,
  type PatientSummaryDto,
} from "../models/patient-summary.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { Indexable } from "@/data/shared/use-cases/indexable.decorator";

@Indexable({
  type: "patient-summary",
  contentFields: ["title", "narrative"],
  sourceIdField: "id",
  metadataFields: ["title", "updatedAt"],
})
export class PatchPatientSummaryUseCase extends UseCase<
  PatchPatientSummaryInput,
  PatientSummaryDto
> {
  constructor(
    private readonly service: PatientSummaryService = patientSummaryService,
  ) {
    super();
  }

  static validate(input: unknown): PatchPatientSummaryInput {
    return PatchPatientSummarySchema.parse(input);
  }

  protected async run(
    input: PatchPatientSummaryInput,
  ): Promise<PatientSummaryDto> {
    return this.service.patch(input);
  }
}
