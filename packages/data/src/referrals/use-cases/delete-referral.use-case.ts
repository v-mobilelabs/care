import { UseCase } from "@/data/shared/use-cases/base.use-case";
import {
  ReferralRefSchema,
  type ReferralRefInput,
} from "../models/referral.model";
import {
  referralService,
  type ReferralService,
} from "../service/referral.service";

export class DeleteReferralUseCase extends UseCase<ReferralRefInput, void> {
  constructor(private readonly service: ReferralService = referralService) {
    super();
  }

  static validate(input: unknown): ReferralRefInput {
    return ReferralRefSchema.parse(input);
  }

  protected async run(input: ReferralRefInput): Promise<void> {
    return this.service.delete(input);
  }
}
