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

const labReportsCol = (userId: string) => scopedCol(userId, "blood-tests");

const labReportDoc = (userId: string, labReportId: string) =>
  labReportsCol(userId).doc(labReportId);

// ── Repository ────────────────────────────────────────────────────────────────

export const labReportRepository = {
  async create(
    userId: string,
    data: Omit<LabReportDocument, "userId" | "createdAt">,
  ): Promise<LabReportDto> {
    const now = Timestamp.now();
    const doc: LabReportDocument = { userId, ...data, createdAt: now };
    const ref = labReportsCol(userId).doc();
    await ref.set(stripUndefined(doc));
    return toLabReportDto(ref.id, doc);
  },

  async findByFileId(
    userId: string,
    fileId: string,
  ): Promise<LabReportDto | null> {
    const snap = await labReportsCol(userId)
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
  ): Promise<LabReportDto> {
    const now = Timestamp.now();
    const ref = labReportDoc(userId, labReportId);
    await ref.update({ ...data, updatedAt: now });
    const snap = await ref.get();
    return toLabReportDto(snap.id, snap.data() as LabReportDocument);
  },

  async findById(
    userId: string,
    labReportId: string,
  ): Promise<LabReportDto | null> {
    const snap = await labReportDoc(userId, labReportId).get();
    if (!snap.exists) return null;
    return toLabReportDto(snap.id, snap.data() as LabReportDocument);
  },

  async list(userId: string, limit: number): Promise<LabReportDto[]> {
    const snap = await labReportsCol(userId)
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
  ): Promise<LabReportDto> {
    const ref = labReportDoc(userId, labReportId);
    await ref.update({ sessionId });
    const snap = await ref.get();
    return toLabReportDto(snap.id, snap.data() as LabReportDocument);
  },

  async delete(userId: string, labReportId: string): Promise<void> {
    await labReportDoc(userId, labReportId).delete();
  },
};
