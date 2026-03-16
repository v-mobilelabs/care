import {
  prescriptionService,
  type PrescriptionService,
} from "../service/prescription.service";
import {
  ListPrescriptionsSchema,
  type ListPrescriptionsInput,
  type PrescriptionDto,
} from "../models/prescription.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ListPrescriptionsUseCase extends UseCase<
  ListPrescriptionsInput,
  PrescriptionDto[]
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: PrescriptionService = prescriptionService,
  ) {
    super();
  }

  static validate(input: unknown): ListPrescriptionsInput {
    return ListPrescriptionsSchema.parse(input);
  }

  protected async run(
    input: ListPrescriptionsInput,
  ): Promise<PrescriptionDto[]> {
    return this.service.list(input, this.dependentId);
  }
}
