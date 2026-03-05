import { Timestamp } from "firebase-admin/firestore";
import { FirebaseService } from "@/data/shared/service/firesbase.service";
import { patientRepository } from "@/data/patients";
import {
  toProfileDto,
  type ProfileDocument,
  type ProfileDto,
  type UpsertProfileInput,
} from "../models/profile.model";

const db = FirebaseService.getInstance().getDb();

/** Base identity document lives at profiles/{userId} (top-level) */
const baseProfileDoc = (userId: string) =>
  db.collection("profiles").doc(userId);

export const profileRepository = {
  /**
   * Returns the combined profile DTO: base identity from `profiles/{userId}`
   * merged with patient health data from `patients/{userId}`.
   */
  async get(userId: string): Promise<ProfileDto | null> {
    const [baseSnap, patientDoc] = await Promise.all([
      baseProfileDoc(userId).get(),
      patientRepository.get(userId).catch(() => null),
    ]);
    if (!baseSnap.exists) return null;
    return toProfileDto(baseSnap.data() as ProfileDocument, patientDoc);
  },

  /**
   * Upserts base identity fields in `profiles/{userId}` only.
   * Patient health fields → PUT /api/patients/me (patientRepository)
   * Doctor professional fields → PUT /api/doctors/me (doctorProfileRepository)
   */
  async upsert(input: UpsertProfileInput): Promise<ProfileDto> {
    const now = Timestamp.now();

    const baseData: Partial<ProfileDocument> & {
      userId: string;
      updatedAt: Timestamp;
    } = {
      userId: input.userId,
      kind: input.kind ?? "user",
      updatedAt: now,
    };
    if (input.name !== undefined) baseData.name = input.name;
    if (input.email !== undefined) baseData.email = input.email;
    if (input.phone !== undefined) baseData.phone = input.phone;
    if (input.photoUrl !== undefined) baseData.photoUrl = input.photoUrl;
    if (input.city !== undefined) baseData.city = input.city;
    if (input.country !== undefined) baseData.country = input.country;

    await baseProfileDoc(input.userId).set(baseData, { merge: true });

    const [baseSnap, patientDoc] = await Promise.all([
      baseProfileDoc(input.userId).get(),
      patientRepository.get(input.userId).catch(() => null),
    ]);
    return toProfileDto(baseSnap.data() as ProfileDocument, patientDoc);
  },
};
