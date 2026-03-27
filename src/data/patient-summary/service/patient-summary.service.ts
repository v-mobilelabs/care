import { patientSummaryRepository } from "../repositories/patient-summary.repository";
import type {
  CreatePatientSummaryInput,
  GetPatientSummaryInput,
  PatchPatientSummaryInput,
  ListPatientSummariesInput,
  DeletePatientSummaryInput,
  PatientSummaryDto,
} from "../models/patient-summary.model";

export class PatientSummaryService {
  async get(input: GetPatientSummaryInput): Promise<PatientSummaryDto | null> {
    return patientSummaryRepository.getCurrent(input.userId);
  }

  async patch(input: PatchPatientSummaryInput): Promise<PatientSummaryDto> {
    return patientSummaryRepository.patchCurrent(
      input.userId,
      input.expectedVersion,
      input.patch,
      input.reason,
    );
  }

  async create(input: CreatePatientSummaryInput): Promise<PatientSummaryDto> {
    return patientSummaryRepository.upsertCurrent(input.userId, {
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
      actionItems: input.actionItems,
    });
  }

  async list(input: ListPatientSummariesInput): Promise<PatientSummaryDto[]> {
    const current = await patientSummaryRepository.getCurrent(input.userId);
    return current ? [current] : [];
  }

  async delete(input: DeletePatientSummaryInput): Promise<void> {
    await patientSummaryRepository.delete(input.userId, input.summaryId);
  }
}

export const patientSummaryService = new PatientSummaryService();
