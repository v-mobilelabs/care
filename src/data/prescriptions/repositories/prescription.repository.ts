import {
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { scopedCol } from "@/data/shared/repositories/scoped-col";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import {
  toPrescriptionDto,
  type PrescriptionDocument,
  type PrescriptionDto,
} from "../models/prescription.model";

// ── Collection helpers ────────────────────────────────────────────────────────

const prescriptionsCol = (userId: string, dependentId?: string) =>
  scopedCol(dependentId ?? userId, "prescriptions");

const prescriptionDoc = (
  userId: string,
  prescriptionId: string,
  dependentId?: string,
) => prescriptionsCol(userId, dependentId).doc(prescriptionId);

// ── Repository ────────────────────────────────────────────────────────────────

export const prescriptionRepository = {
  async create(
    userId: string,
    data: Omit<PrescriptionDocument, "userId" | "createdAt">,
    dependentId?: string,
  ): Promise<PrescriptionDto> {
    const now = Timestamp.now();
    const doc: PrescriptionDocument = { userId, ...data, createdAt: now };
    const ref = prescriptionsCol(userId, dependentId).doc();
    await ref.set(stripUndefined(doc));
    return toPrescriptionDto(ref.id, doc);
  },

  async findByFileId(
    userId: string,
    fileId: string,
    dependentId?: string,
  ): Promise<PrescriptionDto | null> {
    const snap = await prescriptionsCol(userId, dependentId)
      .where("fileId", "==", fileId)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const d = snap.docs[0]!;
    return toPrescriptionDto(d.id, d.data() as PrescriptionDocument);
  },

  async findById(
    userId: string,
    prescriptionId: string,
    dependentId?: string,
  ): Promise<PrescriptionDto | null> {
    const snap = await prescriptionDoc(
      userId,
      prescriptionId,
      dependentId,
    ).get();
    if (!snap.exists) return null;
    return toPrescriptionDto(snap.id, snap.data() as PrescriptionDocument);
  },

  async list(
    userId: string,
    limit: number,
    dependentId?: string,
  ): Promise<PrescriptionDto[]> {
    const snap = await prescriptionsCol(userId, dependentId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toPrescriptionDto(d.id, d.data() as PrescriptionDocument),
    );
  },

  async delete(
    userId: string,
    prescriptionId: string,
    dependentId?: string,
  ): Promise<void> {
    await prescriptionDoc(userId, prescriptionId, dependentId).delete();
  },
};
