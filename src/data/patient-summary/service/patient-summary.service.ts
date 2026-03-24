import { patientSummaryRepository } from "../repositories/patient-summary.repository";
import type {
  CreatePatientSummaryInput,
  ListPatientSummariesInput,
  DeletePatientSummaryInput,
  PatientSummaryDto,
} from "../models/patient-summary.model";

export class PatientSummaryService {
  async create(input: CreatePatientSummaryInput): Promise<PatientSummaryDto> {
    return patientSummaryRepository.create(input.userId, {
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
    });
  }

  async list(input: ListPatientSummariesInput): Promise<PatientSummaryDto[]> {
    return patientSummaryRepository.list(input.userId, input.limit);
  }

  async delete(input: DeletePatientSummaryInput): Promise<void> {
    await patientSummaryRepository.delete(input.userId, input.summaryId);
  }
}

export const patientSummaryService = new PatientSummaryService();
