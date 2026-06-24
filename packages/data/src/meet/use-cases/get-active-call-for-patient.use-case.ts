import { z } from "zod";
import { UseCase } from "@/data/shared/use-cases/base.use-case";
import { meetRepository } from "../repositories/meet.repository";
import type { CallRequestDto } from "../models/meet.model";

const GetActiveCallForPatientSchema = z.object({
  patientId: z.string().min(1),
});

export type GetActiveCallForPatientInput = z.infer<
  typeof GetActiveCallForPatientSchema
>;

export class GetActiveCallForPatientUseCase extends UseCase<
  GetActiveCallForPatientInput,
  CallRequestDto | null
> {
  static validate(input: unknown): GetActiveCallForPatientInput {
    return GetActiveCallForPatientSchema.parse(input);
  }

  protected async run(
    input: GetActiveCallForPatientInput,
  ): Promise<CallRequestDto | null> {
    return meetRepository.getActiveForPatient(input.patientId);
  }
}
