import {
  insuranceService,
  type InsuranceService,
} from "../service/insurance.service";
import {
  CreateInsuranceSchema,
  type CreateInsuranceInput,
  type InsuranceDto,
} from "../models/insurance.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class CreateInsuranceUseCase extends UseCase<
  CreateInsuranceInput,
  InsuranceDto
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: InsuranceService = insuranceService,
  ) {
    super();
  }

  static validate(input: unknown): CreateInsuranceInput {
    return CreateInsuranceSchema.parse(input);
  }

  protected async run(input: CreateInsuranceInput): Promise<InsuranceDto> {
    return this.service.create(input, this.dependentId);
  }
}
