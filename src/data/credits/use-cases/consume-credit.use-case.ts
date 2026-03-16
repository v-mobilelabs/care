import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { CreditRefSchema, type CreditRefInput } from "../models/credit.model";
import { creditRepository } from "../repositories/credit.repository";

export interface ConsumeCreditResult {
  ok: boolean;
  remaining: number;
}

export class ConsumeCreditUseCase extends UseCase<
  CreditRefInput,
  ConsumeCreditResult
> {
  static validate(input: unknown): CreditRefInput {
    return CreditRefSchema.parse(input);
  }

  protected async run(input: CreditRefInput): Promise<ConsumeCreditResult> {
    return creditRepository.consume(input.userId);
  }
}
