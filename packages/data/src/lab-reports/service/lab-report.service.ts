import { labReportRepository } from "../repositories/lab-report.repository";
import type {
  LabReportDto,
  ListLabReportsInput,
  LabReportRefInput,
} from "../models/lab-report.model";

export class LabReportService {
  async list(input: ListLabReportsInput): Promise<LabReportDto[]> {
    return labReportRepository.list(input.userId, input.limit);
  }

  async getById(input: LabReportRefInput): Promise<LabReportDto | null> {
    return labReportRepository.findById(input.userId, input.labReportId);
  }

  async delete(input: LabReportRefInput): Promise<void> {
    await labReportRepository.delete(input.userId, input.labReportId);
  }
}

export const labReportService = new LabReportService();
