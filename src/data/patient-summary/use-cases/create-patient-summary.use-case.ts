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
