/**
 * Fetch Prescriptions Tool — Global tool for all agents
 *
 * Fetches the user's stored prescriptions from Firestore.
 * Available to any agent that needs to check existing prescriptions.
 */

import { tool, zodSchema } from "ai";
import { z } from "zod";
import { prescriptionRepository } from "@/data/prescriptions/repositories/prescription.repository";
import type { PrescriptionDto } from "@/data/prescriptions/models/prescription.model";

export interface PrescriptionSummary {
  prescriptionId: string;
  source: "extracted" | "generated";
  prescribedBy?: string;
  date?: string;
  createdAt: string;
  medications: Array<{
    name: string;
    dosage: string;
    form: string;
    frequency: string;
    duration: string;
    indication: string;
    instructions?: string;
    monitoring?: string;
  }>;
  generalInstructions?: string;
  followUp?: string;
  urgent?: boolean;
  notes?: string;
}

function toSummary(rx: PrescriptionDto): PrescriptionSummary {
  return {
    prescriptionId: rx.id,
    source: rx.source,
    prescribedBy: rx.prescribedBy,
    date: rx.prescriptionDate,
    createdAt: rx.createdAt,
    medications: rx.medications,
    generalInstructions: rx.generalInstructions,
    followUp: rx.followUp,
    urgent: rx.urgent,
    notes: rx.notes,
  };
}

export function createFetchPrescriptionsTool(
  userId: string,
  _profileId: string,
) {
  return tool({
    description:
      "Fetch the patient's stored prescriptions from their health records. " +
      "Call this when the user asks to list, view, show, check, or read their prescriptions or medications. " +
      "Returns all prescription records with their medication details.",
    inputSchema: zodSchema(z.object({})),
    execute: async () => {
      const prescriptions = await prescriptionRepository.list(userId, 50);
      if (prescriptions.length === 0) {
        return {
          found: false,
          count: 0,
          message:
            "No prescription records found. The patient has not yet uploaded any prescription files or received AI-generated prescription recommendations.",
        };
      }
      return {
        found: true,
        count: prescriptions.length,
        prescriptions: prescriptions.map(toSummary),
      };
    },
  });
}
