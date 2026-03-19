import {
  labReportExtractionService,
  type LabReportExtractionService,
} from "../service/lab-report-extraction.service";
import {
  ExtractLabReportInputSchema,
  type ExtractLabReportInput,
  type LabReportDto,
} from "../models/lab-report.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ExtractLabReportUseCase extends UseCase<
  ExtractLabReportInput,
  LabReportDto
> {
  constructor(
    private readonly service: LabReportExtractionService = labReportExtractionService,
  ) {
    super();
  }

  static validate(input: unknown): ExtractLabReportInput {
    return ExtractLabReportInputSchema.parse(input);
  }

  protected async run(input: ExtractLabReportInput): Promise<LabReportDto> {
    return this.service.extract(input);
  }
}
