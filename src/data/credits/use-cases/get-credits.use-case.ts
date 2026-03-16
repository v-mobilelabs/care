import { UseCase } from "@/data/shared/use-cases/base.use-case";
import {
  CreditRefSchema,
  type CreditRefInput,
  type CreditDto,
} from "../models/credit.model";
import { creditRepository } from "../repositories/credit.repository";

export class GetCreditsUseCase extends UseCase<CreditRefInput, CreditDto> {
  static validate(input: unknown): CreditRefInput {
    return CreditRefSchema.parse(input);
  }

  protected async run(input: CreditRefInput): Promise<CreditDto> {
    return creditRepository.get(input.userId);
  }
}
