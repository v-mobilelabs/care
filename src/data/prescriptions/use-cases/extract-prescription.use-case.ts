import {
  prescriptionExtractionService,
  type PrescriptionExtractionService,
} from "../service/prescription-extraction.service";
import {
  ExtractPrescriptionInputSchema,
  type ExtractPrescriptionInput,
  type ExtractResult,
} from "../models/extract.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ExtractPrescriptionUseCase extends UseCase<
  ExtractPrescriptionInput,
  ExtractResult
> {
  constructor(
    private readonly service: PrescriptionExtractionService = prescriptionExtractionService,
  ) {
    super();
  }

  static validate(input: unknown): ExtractPrescriptionInput {
    return ExtractPrescriptionInputSchema.parse(input);
  }

  protected async run(input: ExtractPrescriptionInput): Promise<ExtractResult> {
    return this.service.extract(input);
  }
}
