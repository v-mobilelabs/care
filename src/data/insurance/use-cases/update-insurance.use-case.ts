import {
  insuranceService,
  type InsuranceService,
} from "../service/insurance.service";
import {
  UpdateInsuranceSchema,
  type UpdateInsuranceInput,
  type InsuranceDto,
} from "../models/insurance.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class UpdateInsuranceUseCase extends UseCase<
  UpdateInsuranceInput,
  InsuranceDto
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: InsuranceService = insuranceService,
  ) {
    super();
  }

  static validate(input: unknown): UpdateInsuranceInput {
    return UpdateInsuranceSchema.parse(input);
  }

  protected async run(input: UpdateInsuranceInput): Promise<InsuranceDto> {
    return this.service.update(input, this.dependentId);
  }
}
