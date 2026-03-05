import { meetRepository } from "../repositories/meet.repository";
import type { CallRequestDto } from "../models/meet.model";

export class ListCallHistoryUseCase {
  async execute(params: {
    userId: string;
    kind: "patient" | "doctor";
    limit?: number;
  }): Promise<CallRequestDto[]> {
    const { userId, kind, limit } = params;

    if (kind === "doctor") {
      return meetRepository.listByDoctor(userId, limit);
    }

    return meetRepository.listByPatient(userId, limit);
  }
}
