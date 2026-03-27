import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { profileRepository } from "../repositories/profile.repository";
import { z } from "zod";

const MarkOnboardingTourCompleteSchema = z.object({
  userId: z.string().min(1),
});

// ── Use case ──────────────────────────────────────────────────────────────────

/**
 * Marks the user's onboarding tour as complete by setting the flag on their
 * profile document in `profiles/{userId}`.
 *
 * Returns the updated profile DTO.
 */
export class MarkOnboardingTourCompleteUseCase extends UseCase<
  { userId: string },
  void
> {
  static validate(input: unknown): { userId: string } {
    return MarkOnboardingTourCompleteSchema.parse(input);
  }

  protected async run(input: { userId: string }): Promise<void> {
    if (!input.userId) {
      throw new Error("userId is required");
    }

    await profileRepository.upsert({
      userId: input.userId,
      onboardingTourCompleted: true,
    });
  }
}
