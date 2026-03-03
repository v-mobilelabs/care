import { soapNoteRepository } from "../repositories/soap-note.repository";
import type {
  CreateSoapNoteInput,
  ListSoapNotesInput,
  SoapNoteRefInput,
  SoapNoteDto,
} from "../models/soap-note.model";

export class SoapNoteService {
  /**
   * Upsert: if a SOAP note already exists for this session, update it in-place.
   * Otherwise create a new one. This ensures each session has exactly one note.
   */
  async upsertBySession(
    input: CreateSoapNoteInput,
    dependentId?: string,
  ): Promise<SoapNoteDto> {
    const existing = await soapNoteRepository.findBySession(
      input.userId,
      input.sessionId,
      dependentId,
    );
    if (existing) {
      return soapNoteRepository.update(
        input.userId,
        existing.id,
        {
          condition: input.condition,
          riskLevel: input.riskLevel,
          subjective: input.subjective,
          objective: input.objective,
          assessment: input.assessment,
          plan: input.plan,
        },
        dependentId,
      );
    }
    return soapNoteRepository.create(
      input.userId,
      {
        sessionId: input.sessionId,
        condition: input.condition,
        riskLevel: input.riskLevel,
        subjective: input.subjective,
        objective: input.objective,
        assessment: input.assessment,
        plan: input.plan,
      },
      dependentId,
    );
  }

  async getById(
    input: SoapNoteRefInput,
    dependentId?: string,
  ): Promise<SoapNoteDto | null> {
    return soapNoteRepository.findById(input.userId, input.noteId, dependentId);
  }

  async list(
    input: ListSoapNotesInput,
    dependentId?: string,
  ): Promise<SoapNoteDto[]> {
    return soapNoteRepository.list(input.userId, input.limit, dependentId);
  }

  async delete(input: SoapNoteRefInput, dependentId?: string): Promise<void> {
    await soapNoteRepository.delete(input.userId, input.noteId, dependentId);
  }
}

export const soapNoteService = new SoapNoteService();
