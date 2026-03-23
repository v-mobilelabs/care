import {
  patientSummaryService,
  type PatientSummaryService,
} from "../service/patient-summary.service";
import {
  CreatePatientSummarySchema,
  type CreatePatientSummaryInput,
  type PatientSummaryDto,
} from "../models/patient-summary.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { Indexable } from "@/data/shared/use-cases/indexable.decorator";

@Indexable({
  type: "patient-summary",
  contentFields: ["title", "narrative"],
  sourceIdField: "id",
  metadataFields: ["title", "createdAt"],
})
export class CreatePatientSummaryUseCase extends UseCase<
  CreatePatientSummaryInput,
  PatientSummaryDto
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: PatientSummaryService = patientSummaryService,
  ) {
    super();
  }

  static validate(input: unknown): CreatePatientSummaryInput {
    return CreatePatientSummarySchema.parse(input);
  }

  protected async run(
    input: CreatePatientSummaryInput,
  ): Promise<PatientSummaryDto> {
    return this.service.create(input, this.dependentId);
  }
}
