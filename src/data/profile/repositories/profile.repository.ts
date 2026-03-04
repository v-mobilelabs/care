import { Timestamp } from "firebase-admin/firestore";
import { FirebaseService } from "@/data/shared/service/firesbase.service";
import {
  toProfileDto,
  type ProfileDocument,
  type ProfileDto,
  type UpsertProfileInput,
} from "../models/profile.model";

const db = FirebaseService.getInstance().getDb();

/** Self-profile lives at users/{userId}/profiles/self */
const selfProfileDoc = (userId: string) =>
  db.collection("users").doc(userId).collection("profiles").doc("self");

export const profileRepository = {
  async get(userId: string): Promise<ProfileDto | null> {
    const snap = await selfProfileDoc(userId).get();
    if (!snap.exists) return null;
    return toProfileDto(snap.data() as ProfileDocument);
  },

  async upsert(input: UpsertProfileInput): Promise<ProfileDto> {
    const ref = selfProfileDoc(input.userId);
    const now = Timestamp.now();
    const data: Omit<ProfileDocument, "createdAt"> = {
      userId: input.userId,
      updatedAt: now,
    };

    // Only set defined fields
    if (input.dateOfBirth !== undefined) data.dateOfBirth = input.dateOfBirth;
    if (input.sex !== undefined) data.sex = input.sex;
    if (input.height !== undefined) data.height = input.height;
    if (input.weight !== undefined) data.weight = input.weight;
    if (input.waistCm !== undefined) data.waistCm = input.waistCm;
    if (input.neckCm !== undefined) data.neckCm = input.neckCm;
    if (input.hipCm !== undefined) data.hipCm = input.hipCm;
    if (input.activityLevel !== undefined)
      data.activityLevel = input.activityLevel;
    if (input.country !== undefined) data.country = input.country;
    if (input.city !== undefined) data.city = input.city;
    if (input.foodPreferences !== undefined)
      data.foodPreferences = input.foodPreferences;
    // consentedAt is write-once: only included when the caller explicitly provides it.
    // merge:true ensures it will never overwrite an existing value when not present.
    if (input.consentedAt !== undefined) {
      data.consentedAt = Timestamp.fromDate(new Date(input.consentedAt));
    }

    await ref.set(data, { merge: true });
    const snap = await ref.get();
    return toProfileDto(snap.data() as ProfileDocument);
  },
};
