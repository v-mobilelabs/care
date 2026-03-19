// ── Models ────────────────────────────────────────────────────────────────────
export * from "./models/lab-report.model";

// ── Repository ────────────────────────────────────────────────────────────────
export { labReportRepository } from "./repositories/lab-report.repository";

// ── Services ──────────────────────────────────────────────────────────────────
export {
  LabReportService,
  labReportService,
} from "./service/lab-report.service";
export {
  LabReportExtractionService,
  labReportExtractionService,
} from "./service/lab-report-extraction.service";

// ── Use Cases ─────────────────────────────────────────────────────────────────
export { ListLabReportsUseCase } from "./use-cases/list-lab-reports.use-case";
export { GetLabReportUseCase } from "./use-cases/get-lab-report.use-case";
export { DeleteLabReportUseCase } from "./use-cases/delete-lab-report.use-case";
export { ExtractLabReportUseCase } from "./use-cases/extract-lab-report.use-case";
