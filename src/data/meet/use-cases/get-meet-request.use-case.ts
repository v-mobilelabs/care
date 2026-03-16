import { z } from "zod";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { meetRepository } from "../repositories/meet.repository";
import type { CallRequestDto } from "../models/meet.model";

// ── Schema ────────────────────────────────────────────────────────────────────

export const GetMeetRequestSchema = z.object({
  requestId: z.string().min(1),
});

export type GetMeetRequestInput = z.infer<typeof GetMeetRequestSchema>;

// ── Use case ──────────────────────────────────────────────────────────────────

/**
 * Retrieves a meet/call request by ID.
 * Returns null if the request does not exist.
 */
export class GetMeetRequestUseCase extends UseCase<
  GetMeetRequestInput,
  CallRequestDto | null
> {
  static validate(input: unknown): GetMeetRequestInput {
    return GetMeetRequestSchema.parse(input);
  }

  protected async run(
    input: GetMeetRequestInput,
  ): Promise<CallRequestDto | null> {
    return meetRepository.get(input.requestId);
  }
}
