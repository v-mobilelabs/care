import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { Indexable } from "@/data/shared/use-cases/indexable.decorator";
import { profileRepository } from "../repositories/profile.repository";
import {
  UpsertProfileSchema,
  type UpsertProfileInput,
  type ProfileDto,
} from "../models/profile.model";

// ── Use case ──────────────────────────────────────────────────────────────────

/**
 * Upserts the user's profile document in `profiles/{userId}`.
 * Merges provided fields with existing document; does not delete omitted fields.
 *
 * Returns the full merged profile DTO (including patient health fields if present).
 */
@Indexable({
  type: "profile",
  contentFields: ["name", "gender", "dateOfBirth", "city", "country"],
  sourceIdField: "userId",
  sourceIdPrefix: "profile",
  metadataFields: ["updatedAt", "kind"],
})
export class UpsertProfileUseCase extends UseCase<
  UpsertProfileInput,
  ProfileDto
> {
  static validate(input: unknown): UpsertProfileInput {
    return UpsertProfileSchema.parse(input);
  }

  protected async run(input: UpsertProfileInput): Promise<ProfileDto> {
    return profileRepository.upsert(input);
  }
}
