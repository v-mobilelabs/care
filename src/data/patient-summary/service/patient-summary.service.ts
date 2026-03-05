import { patientSummaryRepository } from "../repositories/patient-summary.repository";
import type {
  CreatePatientSummaryInput,
  ListPatientSummariesInput,
  DeletePatientSummaryInput,
  PatientSummaryDto,
} from "../models/patient-summary.model";

export class PatientSummaryService {
  async create(
    input: CreatePatientSummaryInput,
    dependentId?: string,
  ): Promise<PatientSummaryDto> {
    return patientSummaryRepository.create(
      input.userId,
      {
        sessionId: input.sessionId,
        title: input.title,
        narrative: input.narrative,
        chiefComplaints: input.chiefComplaints,
        diagnoses: input.diagnoses,
        medications: input.medications,
        vitals: input.vitals,
        allergies: input.allergies,
        riskFactors: input.riskFactors,
        recommendations: input.recommendations,
      },
      dependentId,
    );
  }

  async list(
    input: ListPatientSummariesInput,
    dependentId?: string,
  ): Promise<PatientSummaryDto[]> {
    return patientSummaryRepository.list(
      input.userId,
      input.limit,
      dependentId,
    );
  }

  async delete(
    input: DeletePatientSummaryInput,
    dependentId?: string,
  ): Promise<void> {
    await patientSummaryRepository.delete(
      input.userId,
      input.summaryId,
      dependentId,
    );
  }
}

export const patientSummaryService = new PatientSummaryService();
