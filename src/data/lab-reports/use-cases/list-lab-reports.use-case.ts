import {
  labReportService,
  type LabReportService,
} from "../service/lab-report.service";
import {
  ListLabReportsSchema,
  type ListLabReportsInput,
  type LabReportDto,
} from "../models/lab-report.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ListLabReportsUseCase extends UseCase<
  ListLabReportsInput,
  LabReportDto[]
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: LabReportService = labReportService,
  ) {
    super();
  }

  static validate(input: unknown): ListLabReportsInput {
    return ListLabReportsSchema.parse(input);
  }

  protected async run(input: ListLabReportsInput): Promise<LabReportDto[]> {
    return this.service.list(input, this.dependentId);
  }
}
