import { referralRepository } from "../repositories/referral.repository";
import type {
  CreateReferralInput,
  ListReferralsInput,
  PaginatedReferrals,
  ReferralDto,
  ReferralStatus,
  UpdateReferralStatusInput,
} from "../models/referral.model";

export class ReferralService {
  async create(input: CreateReferralInput): Promise<ReferralDto> {
    return referralRepository.create(input.userId, {
      sessionId: input.sessionId,
      specialist: input.specialist,
      reason: input.reason,
      ...(input.reportLabel ? { reportLabel: input.reportLabel } : {}),
      status: "pending",
    });
  }

  async listPaginated(input: ListReferralsInput): Promise<PaginatedReferrals> {
    return referralRepository.listPaginated(input.userId, input);
  }

  async updateStatus(input: UpdateReferralStatusInput): Promise<void> {
    return referralRepository.updateStatus(
      input.userId,
      input.referralId,
      input.status,
    );
  }

  async findBySession(
    userId: string,
    sessionId: string,
  ): Promise<ReferralDto | null> {
    return referralRepository.findBySession(userId, sessionId);
  }

  async createOrUpdateStatus(
    userId: string,
    sessionId: string,
    specialist: string,
    reason: string,
    reportLabel: string | undefined,
    status: ReferralStatus,
  ): Promise<ReferralDto> {
    const existing = await referralRepository.findBySession(userId, sessionId);
    if (existing) {
      await referralRepository.updateStatus(userId, existing.id, status);
      return { ...existing, status };
    }
    return referralRepository.create(userId, {
      sessionId,
      specialist,
      reason,
      ...(reportLabel ? { reportLabel } : {}),
      status,
    });
  }
}

export const referralService = new ReferralService();
