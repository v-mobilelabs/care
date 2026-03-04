import {
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { FirebaseService } from "@/data/shared/service/firesbase.service";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import {
  toDoctorDto,
  type DoctorDocument,
  type DoctorDto,
  type ClinicInfo,
} from "../models/doctor.model";

const db = FirebaseService.getInstance().getDb();

// ── Path helpers ─────────────────────────────────────────────────────────────

const doctorsCol = (userId: string) => db.collection(`users/${userId}/doctors`);

// ── Repository ────────────────────────────────────────────────────────────────

export const doctorRepository = {
  async create(
    userId: string,
    data: Omit<DoctorDocument, "userId" | "createdAt" | "updatedAt">,
  ): Promise<DoctorDto> {
    const now = Timestamp.now();
    const doc: DoctorDocument = {
      userId,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    const ref = doctorsCol(userId).doc();
    await ref.set(stripUndefined(doc));
    return toDoctorDto(ref.id, doc);
  },

  async list(userId: string, limit: number): Promise<DoctorDto[]> {
    const snap = await doctorsCol(userId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toDoctorDto(d.id, d.data() as DoctorDocument),
    );
  },

  async updateClinic(
    userId: string,
    doctorId: string,
    clinic: ClinicInfo,
  ): Promise<void> {
    const now = Timestamp.now();
    await doctorsCol(userId).doc(doctorId).update({ clinic, updatedAt: now });
  },

  async delete(userId: string, doctorId: string): Promise<void> {
    await doctorsCol(userId).doc(doctorId).delete();
  },
};
