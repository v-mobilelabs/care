// BloodTestDto is an alias for LabReportDto — both map to the "blood-tests"
// Firestore collection. This module exists to satisfy agent tool imports.
export type {
  LabReportDto as BloodTestDto,
  LabReportDocument as BloodTestDocument,
  Biomarker,
  BiomarkerStatus,
} from "@/data/lab-reports/models/lab-report.model";
