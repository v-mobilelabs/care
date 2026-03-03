import {
  insuranceService,
  type InsuranceService,
} from "../service/insurance.service";
import {
  ListInsuranceSchema,
  type ListInsuranceInput,
  type InsuranceDto,
} from "../models/insurance.model";
import { UseCase } from "@/data/shared/use-cases/base.use-case";

export class ListInsuranceUseCase extends UseCase<
  ListInsuranceInput,
  InsuranceDto[]
> {
  constructor(
    private readonly dependentId?: string,
    private readonly service: InsuranceService = insuranceService,
  ) {
    super();
  }

  static validate(input: unknown): ListInsuranceInput {
    return ListInsuranceSchema.parse(input);
  }

  protected async run(input: ListInsuranceInput): Promise<InsuranceDto[]> {
    return this.service.list(input, this.dependentId);
  }
}
