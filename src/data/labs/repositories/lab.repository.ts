import { Timestamp } from "firebase-admin/firestore";
import { scopedCol } from "@/data/shared/repositories/scoped-col";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import {
  toLabDto,
  calcHomaIr,
  type LabDocument,
  type LabDto,
  type CreateLabInput,
} from "../models/lab.model";

const labsCol = (userId: string, dependentId?: string) =>
  scopedCol(dependentId ?? userId, "labs");

export const labRepository = {
  async create(
    userId: string,
    data: CreateLabInput,
    dependentId?: string,
  ): Promise<LabDto> {
    const now = Timestamp.now();
    const drawnAt = data.drawnAt
      ? Timestamp.fromDate(new Date(data.drawnAt))
      : now;

    const doc: LabDocument = { userId, drawnAt, createdAt: now };

    if (data.hba1cPct !== undefined) doc.hba1cPct = data.hba1cPct;
    if (data.fastingGlucoseMmol !== undefined)
      doc.fastingGlucoseMmol = data.fastingGlucoseMmol;
    if (data.creatinineUmol !== undefined)
      doc.creatinineUmol = data.creatinineUmol;
    if (data.egfr !== undefined) doc.egfr = data.egfr;
    if (data.totalCholesterolMmol !== undefined)
      doc.totalCholesterolMmol = data.totalCholesterolMmol;
    if (data.ldlMmol !== undefined) doc.ldlMmol = data.ldlMmol;
    if (data.hdlMmol !== undefined) doc.hdlMmol = data.hdlMmol;
    if (data.triglyceridesMmol !== undefined)
      doc.triglyceridesMmol = data.triglyceridesMmol;
    if (data.fastingInsulinUiu !== undefined)
      doc.fastingInsulinUiu = data.fastingInsulinUiu;
    if (data.tshMiu !== undefined) doc.tshMiu = data.tshMiu;
    if (data.vitaminDNmol !== undefined) doc.vitaminDNmol = data.vitaminDNmol;
    if (data.haemoglobinGdl !== undefined)
      doc.haemoglobinGdl = data.haemoglobinGdl;
    if (data.label !== undefined) doc.label = data.label;
    if (data.note !== undefined) doc.note = data.note;

    // Derive HOMA-IR if both fasting glucose and insulin are provided
    if (
      data.fastingGlucoseMmol !== undefined &&
      data.fastingInsulinUiu !== undefined
    ) {
      doc.homaIr = calcHomaIr(data.fastingGlucoseMmol, data.fastingInsulinUiu);
    }

    const ref = labsCol(userId, dependentId).doc();
    await ref.set(stripUndefined(doc));
    return toLabDto(ref.id, doc);
  },

  async list(
    userId: string,
    limit: number,
    dependentId?: string,
  ): Promise<LabDto[]> {
    const snap = await labsCol(userId, dependentId)
      .orderBy("drawnAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => toLabDto(d.id, d.data() as LabDocument));
  },

  async findById(
    userId: string,
    labId: string,
    dependentId?: string,
  ): Promise<LabDto | null> {
    const snap = await labsCol(userId, dependentId).doc(labId).get();
    if (!snap.exists) return null;
    return toLabDto(snap.id, snap.data() as LabDocument);
  },

  async delete(
    userId: string,
    labId: string,
    dependentId?: string,
  ): Promise<void> {
    await labsCol(userId, dependentId).doc(labId).delete();
  },
};
