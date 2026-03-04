import { Timestamp } from "firebase-admin/firestore";
import { scopedCol } from "@/data/shared/repositories/scoped-col";
import {
  toVitalDto,
  type VitalDocument,
  type VitalDto,
  type CreateVitalInput,
} from "../models/vital.model";

const vitalsCol = (userId: string, dependentId?: string) =>
  scopedCol(userId, "vitals", dependentId);

export const vitalRepository = {
  async create(
    userId: string,
    data: CreateVitalInput,
    dependentId?: string,
  ): Promise<VitalDto> {
    const now = Timestamp.now();
    const measuredAt = data.measuredAt
      ? Timestamp.fromDate(new Date(data.measuredAt))
      : now;

    const doc: VitalDocument = {
      userId,
      measuredAt,
      createdAt: now,
    };

    if (data.systolicBp !== undefined) doc.systolicBp = data.systolicBp;
    if (data.diastolicBp !== undefined) doc.diastolicBp = data.diastolicBp;
    if (data.restingHr !== undefined) doc.restingHr = data.restingHr;
    if (data.spo2 !== undefined) doc.spo2 = data.spo2;
    if (data.temperatureC !== undefined) doc.temperatureC = data.temperatureC;
    if (data.respiratoryRate !== undefined)
      doc.respiratoryRate = data.respiratoryRate;
    if (data.glucoseMmol !== undefined) doc.glucoseMmol = data.glucoseMmol;
    if (data.note !== undefined) doc.note = data.note;

    const ref = vitalsCol(userId, dependentId).doc();
    await ref.set(doc);
    return toVitalDto(ref.id, doc);
  },

  async list(
    userId: string,
    limit: number,
    dependentId?: string,
  ): Promise<VitalDto[]> {
    const snap = await vitalsCol(userId, dependentId)
      .orderBy("measuredAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => toVitalDto(d.id, d.data() as VitalDocument));
  },

  async findById(
    userId: string,
    vitalId: string,
    dependentId?: string,
  ): Promise<VitalDto | null> {
    const snap = await vitalsCol(userId, dependentId).doc(vitalId).get();
    if (!snap.exists) return null;
    return toVitalDto(snap.id, snap.data() as VitalDocument);
  },

  async delete(
    userId: string,
    vitalId: string,
    dependentId?: string,
  ): Promise<void> {
    await vitalsCol(userId, dependentId).doc(vitalId).delete();
  },
};
