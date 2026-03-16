import {
  prescriptionService,
  type PrescriptionService,
} from "../service/prescription.service";
import {
  PrescriptionRefSchema,
  type PrescriptionRefInput,
  type PrescriptionDto,
} from "../models/prescription.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class GetPrescriptionUseCase extends UseCase<
  PrescriptionRefInput,
  PrescriptionDto | null
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: PrescriptionService = prescriptionService,
  ) {
    super();
  }

  static validate(input: unknown): PrescriptionRefInput {
    return PrescriptionRefSchema.parse(input);
  }

  protected async run(
    input: PrescriptionRefInput,
  ): Promise<PrescriptionDto | null> {
    return this.service.getById(input, this.dependentId);
  }
}
