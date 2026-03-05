import {
  patientSummaryService,
  type PatientSummaryService,
} from "../service/patient-summary.service";
import {
  ListPatientSummariesSchema,
  type ListPatientSummariesInput,
  type PatientSummaryDto,
} from "../models/patient-summary.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ListPatientSummariesUseCase extends UseCase<
  ListPatientSummariesInput,
  PatientSummaryDto[]
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: PatientSummaryService = patientSummaryService,
  ) {
    super();
  }

  static validate(input: unknown): ListPatientSummariesInput {
    return ListPatientSummariesSchema.parse(input);
  }

  protected async run(
    input: ListPatientSummariesInput,
  ): Promise<PatientSummaryDto[]> {
    return this.service.list(input, this.dependentId);
  }
}
