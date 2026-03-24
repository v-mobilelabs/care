import { UseCase } from "@/data/shared/use-cases/base.use-case";
import {
  CreateReferralSchema,
  type CreateReferralInput,
  type ReferralDto,
} from "../models/referral.model";
import {
  referralService,
  type ReferralService,
} from "../service/referral.service";

export class CreateReferralUseCase extends UseCase<
  CreateReferralInput,
  ReferralDto
> {
  constructor(private readonly service: ReferralService = referralService) {
    super();
  }

  static validate(input: unknown): CreateReferralInput {
    return CreateReferralSchema.parse(input);
  }

  protected async run(input: CreateReferralInput): Promise<ReferralDto> {
    return this.service.create(input);
  }
}
