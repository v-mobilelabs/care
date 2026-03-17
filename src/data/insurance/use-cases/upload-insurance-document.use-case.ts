import { z } from "zod";
import {
  insuranceService,
  type InsuranceService,
} from "../service/insurance.service";
import type { InsuranceDto } from "../models/insurance.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export const UploadInsuranceDocumentSchema = z.object({
  userId: z.string().min(1),
  insuranceId: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  buffer: z.instanceof(Buffer),
});

export type UploadInsuranceDocumentInput = z.infer<
  typeof UploadInsuranceDocumentSchema
>;

export class UploadInsuranceDocumentUseCase extends UseCase<
  UploadInsuranceDocumentInput,
  InsuranceDto
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: InsuranceService = insuranceService,
  ) {
    super();
  }

  static validate(input: unknown): UploadInsuranceDocumentInput {
    return UploadInsuranceDocumentSchema.parse(input);
  }

  protected async run(
    input: UploadInsuranceDocumentInput,
  ): Promise<InsuranceDto> {
    return this.service.uploadDocument(
      input.userId,
      input.insuranceId,
      {
        name: input.fileName,
        mimeType: input.mimeType,
        buffer: input.buffer,
      },
      this.dependentId,
    );
  }
}
