import {
  prescriptionService,
  type PrescriptionService,
} from "../service/prescription.service";
import {
  PrescriptionRefSchema,
  type PrescriptionRefInput,
} from "../models/prescription.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class DeletePrescriptionUseCase extends UseCase<
  PrescriptionRefInput,
  void
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

  protected async run(input: PrescriptionRefInput): Promise<void> {
    return this.service.delete(input, this.dependentId);
  }
}
