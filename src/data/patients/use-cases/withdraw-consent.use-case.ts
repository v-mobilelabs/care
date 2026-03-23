import { z } from "zod";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { patientService } from "../service/patient.service";

// ── Schema ────────────────────────────────────────────────────────────────────

const WithdrawConsentSchema = z.object({
  userId: z.string().min(1),
});

export type WithdrawConsentInput = z.infer<typeof WithdrawConsentSchema>;

// ── Use case ──────────────────────────────────────────────────────────────────

/**
 * Withdraws informed consent by clearing the `consentedAt` field
 * on the patient document at `patients/{userId}`.
 */
export class WithdrawConsentUseCase extends UseCase<
  WithdrawConsentInput,
  void
> {
  static validate(input: unknown): WithdrawConsentInput {
    return WithdrawConsentSchema.parse(input);
  }

  protected async run(input: WithdrawConsentInput): Promise<void> {
    await patientService.withdrawConsent(input.userId);
  }
}
