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

const prescriptionsCol = (userId: string) => scopedCol(userId, "prescriptions");

const prescriptionDoc = (userId: string, prescriptionId: string) =>
  prescriptionsCol(userId).doc(prescriptionId);

// ── Repository ────────────────────────────────────────────────────────────────

export const prescriptionRepository = {
  async create(
    userId: string,
    data: Omit<PrescriptionDocument, "userId" | "createdAt">,
  ): Promise<PrescriptionDto> {
    const now = Timestamp.now();
    const doc: PrescriptionDocument = { userId, ...data, createdAt: now };
    const ref = prescriptionsCol(userId).doc();
    await ref.set(stripUndefined(doc));
    return toPrescriptionDto(ref.id, doc);
  },

  async findByFileId(
    userId: string,
    fileId: string,
  ): Promise<PrescriptionDto | null> {
    const snap = await prescriptionsCol(userId)
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
  ): Promise<PrescriptionDto | null> {
    const snap = await prescriptionDoc(userId, prescriptionId).get();
    if (!snap.exists) return null;
    return toPrescriptionDto(snap.id, snap.data() as PrescriptionDocument);
  },

  async list(userId: string, limit: number): Promise<PrescriptionDto[]> {
    const snap = await prescriptionsCol(userId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toPrescriptionDto(d.id, d.data() as PrescriptionDocument),
    );
  },

  async delete(userId: string, prescriptionId: string): Promise<void> {
    await prescriptionDoc(userId, prescriptionId).delete();
  },

  async patchSessionId(
    userId: string,
    prescriptionId: string,
    sessionId: string,
  ): Promise<PrescriptionDto> {
    const ref = prescriptionDoc(userId, prescriptionId);
    await ref.update({ sessionId });
    const snap = await ref.get();
    return toPrescriptionDto(snap.id, snap.data() as PrescriptionDocument);
  },
};
