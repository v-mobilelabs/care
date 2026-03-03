import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { CreditRefSchema, type CreditRefInput } from "../models/credit.model";
import { creditService, type CreditService } from "../service/credit.service";

export interface ConsumeCreditResult {
  ok: boolean;
  remaining: number;
}

export class ConsumeCreditUseCase extends UseCase<
  CreditRefInput,
  ConsumeCreditResult
> {
  constructor(private readonly service: CreditService = creditService) {
    super();
  }

  static validate(input: unknown): CreditRefInput {
    return CreditRefSchema.parse(input);
  }

  protected async run(input: CreditRefInput): Promise<ConsumeCreditResult> {
    return this.service.consume(input.userId);
  }
}
