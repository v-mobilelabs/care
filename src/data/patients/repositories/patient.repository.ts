import { Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import {
  toPatientDto,
  type PatientDocument,
  type PatientDto,
  type UpsertPatientInput,
} from "../models/patient.model";

/** Patient health data lives at patients/{userId} (top-level) */
const patientDoc = (userId: string) => db.collection("patients").doc(userId);

export const patientRepository = {
  async get(userId: string): Promise<PatientDto | null> {
    const snap = await patientDoc(userId).get();
    if (!snap.exists) return null;
    return toPatientDto(snap.data() as PatientDocument);
  },

  async upsert(input: UpsertPatientInput): Promise<PatientDto> {
    const ref = patientDoc(input.userId);
    const now = Timestamp.now();

    const data: Partial<PatientDocument> & {
      userId: string;
      updatedAt: Timestamp;
    } = {
      userId: input.userId,
      updatedAt: now,
    };

    if (input.dateOfBirth !== undefined) data.dateOfBirth = input.dateOfBirth;
    if (input.sex !== undefined) data.sex = input.sex;
    if (input.height !== undefined) data.height = input.height;
    if (input.weight !== undefined) data.weight = input.weight;
    if (input.waistCm !== undefined) data.waistCm = input.waistCm;
    if (input.neckCm !== undefined) data.neckCm = input.neckCm;
    if (input.hipCm !== undefined) data.hipCm = input.hipCm;
    if (input.activityLevel !== undefined)
      data.activityLevel = input.activityLevel;
    if (input.foodPreferences !== undefined)
      data.foodPreferences = input.foodPreferences;
    if (input.bloodGroup !== undefined) data.bloodGroup = input.bloodGroup;
    if (input.consentedAt !== undefined) {
      data.consentedAt = Timestamp.fromDate(new Date(input.consentedAt));
    }

    await ref.set(data, { merge: true });
    const snap = await ref.get();
    return toPatientDto(snap.data() as PatientDocument);
  },
};
