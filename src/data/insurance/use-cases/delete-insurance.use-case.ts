import {
  insuranceService,
  type InsuranceService,
} from "../service/insurance.service";
import {
  DeleteInsuranceSchema,
  type DeleteInsuranceInput,
} from "../models/insurance.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class DeleteInsuranceUseCase extends UseCase<
  DeleteInsuranceInput,
  void
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: InsuranceService = insuranceService,
  ) {
    super();
  }

  static validate(input: unknown): DeleteInsuranceInput {
    return DeleteInsuranceSchema.parse(input);
  }

  protected async run(input: DeleteInsuranceInput): Promise<void> {
    return this.service.delete(input, this.dependentId);
  }
}
