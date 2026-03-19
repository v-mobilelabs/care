import {
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { scopedCol } from "@/data/shared/repositories/scoped-col";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import {
  toLabReportDto,
  type LabReportDocument,
  type LabReportDto,
} from "../models/lab-report.model";

// ── Collection helpers ────────────────────────────────────────────────────────

const labReportsCol = (userId: string, dependentId?: string) =>
  scopedCol(dependentId ?? userId, "blood-tests");

const labReportDoc = (
  userId: string,
  labReportId: string,
  dependentId?: string,
) => labReportsCol(userId, dependentId).doc(labReportId);

// ── Repository ────────────────────────────────────────────────────────────────

export const labReportRepository = {
  async create(
    userId: string,
    data: Omit<LabReportDocument, "userId" | "createdAt">,
    dependentId?: string,
  ): Promise<LabReportDto> {
    const now = Timestamp.now();
    const doc: LabReportDocument = { userId, ...data, createdAt: now };
    const ref = labReportsCol(userId, dependentId).doc();
    await ref.set(stripUndefined(doc));
    return toLabReportDto(ref.id, doc);
  },

  async findByFileId(
    userId: string,
    fileId: string,
    dependentId?: string,
  ): Promise<LabReportDto | null> {
    const snap = await labReportsCol(userId, dependentId)
      .where("fileId", "==", fileId)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const d = snap.docs[0]!;
    return toLabReportDto(d.id, d.data() as LabReportDocument);
  },

  async update(
    userId: string,
    labReportId: string,
    data: Omit<LabReportDocument, "userId" | "fileId" | "createdAt">,
    dependentId?: string,
  ): Promise<LabReportDto> {
    const now = Timestamp.now();
    const ref = labReportDoc(userId, labReportId, dependentId);
    await ref.update({ ...data, updatedAt: now });
    const snap = await ref.get();
    return toLabReportDto(snap.id, snap.data() as LabReportDocument);
  },

  async findById(
    userId: string,
    labReportId: string,
    dependentId?: string,
  ): Promise<LabReportDto | null> {
    const snap = await labReportDoc(userId, labReportId, dependentId).get();
    if (!snap.exists) return null;
    return toLabReportDto(snap.id, snap.data() as LabReportDocument);
  },

  async list(
    userId: string,
    limit: number,
    dependentId?: string,
  ): Promise<LabReportDto[]> {
    const snap = await labReportsCol(userId, dependentId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toLabReportDto(d.id, d.data() as LabReportDocument),
    );
  },

  async patchSessionId(
    userId: string,
    labReportId: string,
    sessionId: string,
    dependentId?: string,
  ): Promise<LabReportDto> {
    const ref = labReportDoc(userId, labReportId, dependentId);
    await ref.update({ sessionId });
    const snap = await ref.get();
    return toLabReportDto(snap.id, snap.data() as LabReportDocument);
  },

  async delete(
    userId: string,
    labReportId: string,
    dependentId?: string,
  ): Promise<void> {
    await labReportDoc(userId, labReportId, dependentId).delete();
  },
};
