import {
  insuranceExtractionService,
  type InsuranceExtractionService,
} from "../service/insurance-extraction.service";
import {
  ExtractInsuranceInputSchema,
  type ExtractInsuranceInput,
  type InsuranceExtractResult,
} from "../models/extract.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ExtractInsuranceUseCase extends UseCase<
  ExtractInsuranceInput,
  InsuranceExtractResult
> {
  constructor(
    private readonly service: InsuranceExtractionService = insuranceExtractionService,
  ) {
    super();
  }

  static validate(input: unknown): ExtractInsuranceInput {
    return ExtractInsuranceInputSchema.parse(input);
  }

  protected async run(
    input: ExtractInsuranceInput,
  ): Promise<InsuranceExtractResult> {
    return this.service.extract(input);
  }
}
