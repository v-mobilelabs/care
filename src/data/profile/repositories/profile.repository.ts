import { Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import {
  toProfileDto,
  type ProfileDocument,
  type ProfileDto,
  type UpsertProfileInput,
} from "../models/profile.model";

/** Base identity document lives at profiles/{userId} (top-level) */
const baseProfileDoc = (userId: string) =>
  db.collection("profiles").doc(userId);

export const profileRepository = {
  /**
   * Returns the base identity profile DTO from `profiles/{userId}`.
   * Patient health fields (sex, height, weight, etc.) live in `patients/{userId}`.
   */
  async get(userId: string): Promise<ProfileDto | null> {
    const baseSnap = await baseProfileDoc(userId).get();
    if (!baseSnap.exists) return null;
    return toProfileDto(baseSnap.data() as ProfileDocument);
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
    if (input.gender !== undefined) baseData.gender = input.gender;
    if (input.city !== undefined) baseData.city = input.city;
    if (input.country !== undefined) baseData.country = input.country;
    if (input.dateOfBirth !== undefined)
      baseData.dateOfBirth = input.dateOfBirth;

    await baseProfileDoc(input.userId).set(baseData, { merge: true });

    const baseSnap = await baseProfileDoc(input.userId).get();
    return toProfileDto(baseSnap.data() as ProfileDocument);
  },
};
