import {
  labReportService,
  type LabReportService,
} from "../service/lab-report.service";
import {
  LabReportRefSchema,
  type LabReportRefInput,
  type LabReportDto,
} from "../models/lab-report.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class GetLabReportUseCase extends UseCase<
  LabReportRefInput,
  LabReportDto | null
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: LabReportService = labReportService,
  ) {
    super();
  }

  static validate(input: unknown): LabReportRefInput {
    return LabReportRefSchema.parse(input);
  }

  protected async run(input: LabReportRefInput): Promise<LabReportDto | null> {
    return this.service.getById(input, this.dependentId);
  }
}
