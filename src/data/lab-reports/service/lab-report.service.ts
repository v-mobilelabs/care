import { labReportRepository } from "../repositories/lab-report.repository";
import type {
  LabReportDto,
  ListLabReportsInput,
  LabReportRefInput,
} from "../models/lab-report.model";

export class LabReportService {
  async list(
    input: ListLabReportsInput,
    dependentId?: string,
  ): Promise<LabReportDto[]> {
    return labReportRepository.list(input.userId, input.limit, dependentId);
  }

  async getById(
    input: LabReportRefInput,
    dependentId?: string,
  ): Promise<LabReportDto | null> {
    return labReportRepository.findById(
      input.userId,
      input.labReportId,
      dependentId,
    );
  }

  async delete(input: LabReportRefInput, dependentId?: string): Promise<void> {
    await labReportRepository.delete(
      input.userId,
      input.labReportId,
      dependentId,
    );
  }
}

export const labReportService = new LabReportService();
