import { Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import type {
  AvailabilityStatus,
  DoctorProfileDocument,
} from "../models/doctor-profile.model";

// ── Collection ref ────────────────────────────────────────────────────────────
// Professional data lives at the top-level doctors/{uid} collection.
// Base identity (name, email, phone, kind) lives in profiles/{uid}.

const col = () => db.collection("doctors");

// ── Repository ────────────────────────────────────────────────────────────────

export const doctorProfileRepository = {
  async create(
    data: Omit<DoctorProfileDocument, "createdAt" | "updatedAt">,
  ): Promise<DoctorProfileDocument> {
    const now = Timestamp.now();
    const doc: DoctorProfileDocument = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    await col().doc(data.uid).set(stripUndefined(doc));
    return doc;
  },

  async get(uid: string): Promise<DoctorProfileDocument | null> {
    const snap = await col().doc(uid).get();
    if (!snap.exists) return null;
    return snap.data() as DoctorProfileDocument;
  },

  async exists(uid: string): Promise<boolean> {
    const snap = await col().doc(uid).get();
    return snap.exists;
  },

  /**
   * Creates the doctor doc if it doesn't exist; otherwise merges only the
   * provided professional fields (specialty, licenseNumber, bio).
   */
  async upsert(data: {
    uid: string;
    specialty?: string;
    licenseNumber?: string;
    bio?: string;
  }): Promise<void> {
    const now = Timestamp.now();
    const docRef = col().doc(data.uid);
    const snap = await docRef.get();
    if (!snap.exists) {
      await docRef.set(
        stripUndefined({
          uid: data.uid,
          specialty: data.specialty ?? "",
          licenseNumber: data.licenseNumber ?? "",
          bio: data.bio,
          availability: "unavailable" as const,
          createdAt: now,
          updatedAt: now,
        }),
      );
    } else {
      await docRef.update(
        stripUndefined({
          specialty: data.specialty,
          licenseNumber: data.licenseNumber,
          bio: data.bio,
          updatedAt: now,
        }),
      );
    }
  },

  async updateAvailability(
    uid: string,
    availability: AvailabilityStatus,
  ): Promise<DoctorProfileDocument> {
    const now = Timestamp.now();
    await col().doc(uid).update({ availability, updatedAt: now });
    const snap = await col().doc(uid).get();
    return snap.data() as DoctorProfileDocument;
  },
};
