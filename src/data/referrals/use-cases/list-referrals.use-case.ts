import { UseCase } from "@/data/shared/use-cases/base.use-case";
import {
  ListReferralsSchema,
  type ListReferralsInput,
  type PaginatedReferrals,
} from "../models/referral.model";
import {
  referralService,
  type ReferralService,
} from "../service/referral.service";

export class ListReferralsUseCase extends UseCase<
  ListReferralsInput,
  PaginatedReferrals
> {
  constructor(private readonly service: ReferralService = referralService) {
    super();
  }

  static validate(input: unknown): ListReferralsInput {
    return ListReferralsSchema.parse(input);
  }

  protected async run(input: ListReferralsInput): Promise<PaginatedReferrals> {
    return this.service.listPaginated(input);
  }
}
