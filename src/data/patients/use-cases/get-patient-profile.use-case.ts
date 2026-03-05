import { z } from "zod";
import { profileRepository } from "@/data/profile";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import type { ProfileDto } from "@/data/profile/models/profile.model";

const GetPatientProfileSchema = z.object({ userId: z.string().min(1) });
type GetPatientProfileInput = z.infer<typeof GetPatientProfileSchema>;

/**
 * Fetches the merged profile DTO for a given user:
 * base identity from `profiles/{userId}` + patient health data from `patients/{userId}`.
 */
export class GetPatientProfileUseCase extends UseCase<
  GetPatientProfileInput,
  ProfileDto | null
> {
  static validate(input: unknown): GetPatientProfileInput {
    return GetPatientProfileSchema.parse(input);
  }

  protected async run(
    input: GetPatientProfileInput,
  ): Promise<ProfileDto | null> {
    return profileRepository.get(input.userId);
  }
}
