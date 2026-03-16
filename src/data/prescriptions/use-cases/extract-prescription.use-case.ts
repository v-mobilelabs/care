import {
  prescriptionExtractionService,
  type PrescriptionExtractionService,
} from "../service/prescription-extraction.service";
import {
  ExtractPrescriptionInputSchema,
  type ExtractPrescriptionInput,
} from "../models/extract.model";
import type { PrescriptionDto } from "../models/prescription.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { Indexable } from "@/data/shared/use-cases/indexable.decorator";

@Indexable({
  type: "prescription",
  contentFields: ["prescribedBy", "prescriptionDate", "medications", "notes"],
  sourceIdField: "id",
  metadataFields: ["prescribedBy", "prescriptionDate", "createdAt"],
})
export class ExtractPrescriptionUseCase extends UseCase<
  ExtractPrescriptionInput,
  PrescriptionDto
> {
  constructor(
    private readonly service: PrescriptionExtractionService = prescriptionExtractionService,
  ) {
    super();
  }

  static validate(input: unknown): ExtractPrescriptionInput {
    return ExtractPrescriptionInputSchema.parse(input);
  }

  protected async run(
    input: ExtractPrescriptionInput,
  ): Promise<PrescriptionDto> {
    return this.service.extract(input);
  }
}
