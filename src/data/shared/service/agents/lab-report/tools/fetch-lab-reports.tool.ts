/**
 * Fetch Lab Reports Tool — Read the user's stored lab report records from Firestore.
 *
 * Used by the lab report agent when the user asks to list, view, or check
 * their existing lab report results. Returns all lab report records with
 * their biomarker data.
 */

import { tool, zodSchema } from "ai";
import { z } from "zod";
import { labReportRepository } from "@/data/lab-reports/repositories/lab-report.repository";
import type { LabReportDto } from "@/data/lab-reports/models/lab-report.model";

export interface LabReportSummary {
  labReportId: string;
  testName: string;
  labName?: string;
  orderedBy?: string;
  testDate?: string;
  createdAt: string;
  notes?: string;
  biomarkers: Array<{
    name: string;
    value: string;
    unit: string;
    referenceRange?: string;
    status: "normal" | "low" | "high" | "critical";
  }>;
}

function toSummary(bt: LabReportDto): LabReportSummary {
  return {
    labReportId: bt.id,
    testName: bt.testName,
    labName: bt.labName,
    orderedBy: bt.orderedBy,
    testDate: bt.testDate,
    createdAt: bt.createdAt,
    notes: bt.notes,
    biomarkers: bt.biomarkers,
  };
}

export function createFetchLabReportsTool(
  userId: string,
  profileId: string,
  dependentId?: string,
) {
  return tool({
    description:
      "Fetch the patient's stored lab report records from their health records. " +
      "Call this when the user asks to list, view, show, check, or read their blood tests, lab results, or biomarkers. " +
      "Returns all lab report records with their biomarker details.",
    inputSchema: zodSchema(z.object({})),
    execute: async () => {
      const labReports = await labReportRepository.list(
        userId,
        50,
        dependentId,
      );
      if (labReports.length === 0) {
        return {
          found: false,
          count: 0,
          message:
            "No lab report records found. The patient has not yet uploaded any lab reports.",
        };
      }
      return {
        found: true,
        count: labReports.length,
        labReports: labReports.map(toSummary),
      };
    },
  });
}
