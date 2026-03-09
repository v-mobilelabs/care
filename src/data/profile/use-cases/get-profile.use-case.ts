import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { profileRepository } from "../repositories/profile.repository";
import {
  GetProfileSchema,
  type GetProfileInput,
  type ProfileDto,
} from "../models/profile.model";

// ── Use case ──────────────────────────────────────────────────────────────────

/**
 * Returns the combined profile DTO for a given user:
 * base identity fields from `profiles/{userId}` merged with
 * patient health fields from `patients/{userId}`.
 *
 * Returns `null` when no profile document exists yet.
 */
export class GetProfileUseCase extends UseCase<
  GetProfileInput,
  ProfileDto | null
> {
  static validate(input: unknown): GetProfileInput {
    return GetProfileSchema.parse(input);
  }

  protected async run(input: GetProfileInput): Promise<ProfileDto | null> {
    return profileRepository.get(input.userId);
  }
}
