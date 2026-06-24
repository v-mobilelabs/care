import {
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import { scopedCol } from "@/data/shared/repositories/scoped-col";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import {
  PatientSummaryNotFoundError,
  PatientSummaryVersionConflictError,
  toPatientSummaryDto,
  type PatchPatientSummaryPatch,
  type PatientSummaryDocument,
  type PatientSummaryDto,
} from "../models/patient-summary.model";

// ── Path helpers ──────────────────────────────────────────────────────────────

const summariesCol = (userId: string) => scopedCol(userId, "patient-summaries");
const currentSummaryRef = (userId: string) => summariesCol(userId).doc("main");

function buildContentDefaults(): Omit<
  PatientSummaryDocument,
  "userId" | "createdAt" | "updatedAt" | "version" | "status"
> {
  return {
    title: "Patient Summary",
    narrative: "",
    chiefComplaints: [],
    diagnoses: [],
    medications: [],
    vitals: [],
    allergies: [],
    riskFactors: [],
    recommendations: [],
    actionItems: [],
  };
}

// ── Repository ────────────────────────────────────────────────────────────────

export const patientSummaryRepository = {
  async getCurrent(userId: string): Promise<PatientSummaryDto | null> {
    const snap = await currentSummaryRef(userId).get();
    if (!snap.exists) return null;
    return toPatientSummaryDto("main", snap.data() as PatientSummaryDocument);
  },

  async upsertCurrent(
    userId: string,
    data: Omit<
      PatientSummaryDocument,
      "userId" | "createdAt" | "updatedAt" | "version" | "status"
    >,
  ): Promise<PatientSummaryDto> {
    const ref = currentSummaryRef(userId);

    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const now = Timestamp.now();

      if (snap.exists) {
        const existing = snap.data() as PatientSummaryDocument;
        const next: PatientSummaryDocument = {
          ...existing,
          ...data,
          userId,
          version: (existing.version ?? 1) + 1,
          status: "active",
          updatedAt: now,
          createdAt: existing.createdAt ?? now,
        };
        tx.set(ref, stripUndefined(next));
        return toPatientSummaryDto("main", next);
      }

      const created: PatientSummaryDocument = {
        userId,
        ...buildContentDefaults(),
        ...data,
        version: 1,
        status: "active",
        createdAt: now,
        updatedAt: now,
      };
      tx.set(ref, stripUndefined(created));
      return toPatientSummaryDto("main", created);
    });
  },

  async patchCurrent(
    userId: string,
    expectedVersion: number,
    patch: PatchPatientSummaryPatch,
    reason:
      | "assistant_update"
      | "doctor_edit"
      | "system_rebuild" = "assistant_update",
  ): Promise<PatientSummaryDto> {
    const ref = currentSummaryRef(userId);

    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new PatientSummaryNotFoundError();

      const existing = snap.data() as PatientSummaryDocument;
      const currentVersion = existing.version ?? 1;
      if (currentVersion !== expectedVersion) {
        throw new PatientSummaryVersionConflictError(currentVersion);
      }

      const now = Timestamp.now();
      const next: PatientSummaryDocument = {
        ...existing,
        ...patch,
        userId,
        version: currentVersion + 1,
        status: "active",
        lastUpdatedBy: reason,
        updatedAt: now,
      };

      tx.set(ref, stripUndefined(next));
      return toPatientSummaryDto("main", next);
    });
  },

  async create(
    userId: string,
    data: Omit<PatientSummaryDocument, "userId" | "createdAt" | "updatedAt">,
  ): Promise<PatientSummaryDto> {
    const now = Timestamp.now();
    const doc: PatientSummaryDocument = {
      userId,
      ...data,
      version: 1,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    const ref = summariesCol(userId).doc();
    await ref.set(stripUndefined(doc));
    return toPatientSummaryDto(ref.id, doc);
  },

  async list(userId: string, limit: number): Promise<PatientSummaryDto[]> {
    const snap = await summariesCol(userId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toPatientSummaryDto(d.id, d.data() as PatientSummaryDocument),
    );
  },

  async delete(userId: string, summaryId: string): Promise<void> {
    await summariesCol(userId).doc(summaryId).delete();
  },
};
