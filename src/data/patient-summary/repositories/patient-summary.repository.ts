import {
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { scopedCol } from "@/data/shared/repositories/scoped-col";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import {
  toPatientSummaryDto,
  type PatientSummaryDocument,
  type PatientSummaryDto,
} from "../models/patient-summary.model";

const summariesCol = (userId: string, dependentId?: string) =>
  scopedCol(dependentId ?? userId, "patient-summaries");

export const patientSummaryRepository = {
  async create(
    userId: string,
    data: Omit<PatientSummaryDocument, "userId" | "createdAt" | "updatedAt">,
    dependentId?: string,
  ): Promise<PatientSummaryDto> {
    const now = Timestamp.now();
    const doc: PatientSummaryDocument = {
      userId,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    const ref = summariesCol(userId, dependentId).doc();
    await ref.set(stripUndefined(doc));
    return toPatientSummaryDto(ref.id, doc);
  },

  async list(
    userId: string,
    limit: number,
    dependentId?: string,
  ): Promise<PatientSummaryDto[]> {
    const snap = await summariesCol(userId, dependentId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toPatientSummaryDto(d.id, d.data() as PatientSummaryDocument),
    );
  },

  async delete(
    userId: string,
    summaryId: string,
    dependentId?: string,
  ): Promise<void> {
    await summariesCol(userId, dependentId).doc(summaryId).delete();
  },
};
