import { UseCase } from "@/data/shared/use-cases/base.use-case";
import {
  UpdateReferralStatusSchema,
  type UpdateReferralStatusInput,
} from "../models/referral.model";
import {
  referralService,
  type ReferralService,
} from "../service/referral.service";

export class UpdateReferralStatusUseCase extends UseCase<
  UpdateReferralStatusInput,
  void
> {
  constructor(private readonly service: ReferralService = referralService) {
    super();
  }

  static validate(input: unknown): UpdateReferralStatusInput {
    return UpdateReferralStatusSchema.parse(input);
  }

  protected async run(input: UpdateReferralStatusInput): Promise<void> {
    return this.service.updateStatus(input);
  }
}
