import { UseCase } from "@/data/shared/use-cases/base.use-case";
import {
  CreditRefSchema,
  type CreditRefInput,
  type CreditDto,
} from "../models/credit.model";
import { creditService, type CreditService } from "../service/credit.service";

export class GetCreditsUseCase extends UseCase<CreditRefInput, CreditDto> {
  constructor(private readonly service: CreditService = creditService) {
    super();
  }

  static validate(input: unknown): CreditRefInput {
    return CreditRefSchema.parse(input);
  }

  protected async run(input: CreditRefInput): Promise<CreditDto> {
    return this.service.get(input.userId);
  }
}
