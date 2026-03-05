import {
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { scopedCol } from "@/data/shared/repositories/scoped-col";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import {
  toMedicationDto,
  type MedicationDocument,
  type MedicationDto,
} from "../models/medication.model";

const medicationsCol = (userId: string, dependentId?: string) =>
  scopedCol(dependentId ?? userId, "medications");

export const medicationRepository = {
  async create(
    userId: string,
    dependentId: string | undefined,
    data: Omit<MedicationDocument, "userId" | "createdAt" | "updatedAt">,
  ): Promise<MedicationDto> {
    const ref = medicationsCol(userId, dependentId).doc();
    const now = Timestamp.now();
    const clean = { ...data, userId, createdAt: now, updatedAt: now };
    await ref.set(stripUndefined(clean));
    return toMedicationDto(ref.id, clean);
  },

  async list(
    userId: string,
    limit: number,
    dependentId?: string,
  ): Promise<MedicationDto[]> {
    const snap = await medicationsCol(userId, dependentId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toMedicationDto(d.id, d.data() as MedicationDocument),
    );
  },

  async update(
    userId: string,
    medicationId: string,
    data: Partial<
      Omit<MedicationDocument, "userId" | "createdAt" | "updatedAt">
    >,
    dependentId?: string,
  ): Promise<MedicationDto> {
    const ref = medicationsCol(userId, dependentId).doc(medicationId);
    const now = Timestamp.now();
    const clean = Object.fromEntries(
      Object.entries({ ...data, updatedAt: now }).filter(
        ([, v]) => v !== undefined,
      ),
    );
    await ref.update(clean);
    const snap = await ref.get();
    return toMedicationDto(snap.id, snap.data() as MedicationDocument);
  },

  async delete(
    userId: string,
    medicationId: string,
    dependentId?: string,
  ): Promise<void> {
    await medicationsCol(userId, dependentId).doc(medicationId).delete();
  },
};
