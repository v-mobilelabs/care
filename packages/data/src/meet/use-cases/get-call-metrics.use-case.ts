import { z } from "zod";
import { meetRepository } from "../repositories/meet.repository";
import {
  MONTHLY_CALL_LIMIT,
  nextMonthStartUTC,
  type CallMetricsDto,
} from "../models/meet.model";

// ── Validation ────────────────────────────────────────────────────────────────

const InputSchema = z.object({
  patientId: z.string().min(1, { message: "patientId is required" }),
});

type Input = z.infer<typeof InputSchema>;

// ── Use Case ──────────────────────────────────────────────────────────────────

export class GetCallMetricsUseCase {
  static validate(input: unknown): Input {
    return InputSchema.parse(input);
  }

  async execute(input: Input): Promise<CallMetricsDto> {
    const used = await meetRepository.countByPatientThisMonth(input.patientId);
    return {
      used,
      limit: MONTHLY_CALL_LIMIT,
      resetsAt: nextMonthStartUTC(),
    };
  }
}
