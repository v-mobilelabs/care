import { Timestamp } from "firebase-admin/firestore";
import { scopedCol } from "@/data/shared/repositories/scoped-col";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import {
  toVitalDto,
  type VitalDocument,
  type VitalDto,
  type CreateVitalInput,
} from "../models/vital.model";

const vitalsCol = (userId: string, dependentId?: string) =>
  scopedCol(dependentId ?? userId, "vitals");

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

    const doc = stripUndefined({
      userId,
      weightKg: data.weightKg,
      heightCm: data.heightCm,
      systolicBp: data.systolicBp,
      diastolicBp: data.diastolicBp,
      restingHr: data.restingHr,
      spo2: data.spo2,
      temperatureC: data.temperatureC,
      respiratoryRate: data.respiratoryRate,
      glucoseMgdl: data.glucoseMgdl,
      measuredAt,
      createdAt: now,
    }) as unknown as VitalDocument;

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
