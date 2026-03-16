/**
 * Fetch Blood Tests Tool — Read the user's stored blood test records from Firestore.
 *
 * Used by the blood test agent when the user asks to list, view, or check
 * their existing blood test results. Returns all blood test records with
 * their biomarker data.
 */

import { tool, zodSchema } from "ai";
import { z } from "zod";
import { bloodTestRepository } from "@/data/blood-tests/repositories/blood-test.repository";
import type { BloodTestDto } from "@/data/blood-tests/models/blood-test.model";

export interface BloodTestSummary {
  bloodTestId: string;
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

function toSummary(bt: BloodTestDto): BloodTestSummary {
  return {
    bloodTestId: bt.id,
    testName: bt.testName,
    labName: bt.labName,
    orderedBy: bt.orderedBy,
    testDate: bt.testDate,
    createdAt: bt.createdAt,
    notes: bt.notes,
    biomarkers: bt.biomarkers,
  };
}

export function createFetchBloodTestsTool(
  userId: string,
  profileId: string,
  dependentId?: string,
) {
  return tool({
    description:
      "Fetch the patient's stored blood test records from their health records. " +
      "Call this when the user asks to list, view, show, check, or read their blood tests, lab results, or biomarkers. " +
      "Returns all blood test records with their biomarker details.",
    inputSchema: zodSchema(z.object({})),
    execute: async () => {
      const bloodTests = await bloodTestRepository.list(
        userId,
        50,
        dependentId,
      );
      if (bloodTests.length === 0) {
        return {
          found: false,
          count: 0,
          message:
            "No blood test records found. The patient has not yet uploaded any blood test reports.",
        };
      }
      return {
        found: true,
        count: bloodTests.length,
        bloodTests: bloodTests.map(toSummary),
      };
    },
  });
}
