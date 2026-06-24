import {
  patientSummaryService,
  type PatientSummaryService,
} from "../service/patient-summary.service";
import {
  GetPatientSummarySchema,
  type GetPatientSummaryInput,
  type PatientSummaryDto,
} from "../models/patient-summary.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class GetPatientSummaryUseCase extends UseCase<
  GetPatientSummaryInput,
  PatientSummaryDto | null
> {
  constructor(
    private readonly service: PatientSummaryService = patientSummaryService,
  ) {
    super();
  }

  static validate(input: unknown): GetPatientSummaryInput {
    return GetPatientSummarySchema.parse(input);
  }

  protected async run(
    input: GetPatientSummaryInput,
  ): Promise<PatientSummaryDto | null> {
    return this.service.get(input);
  }
}
