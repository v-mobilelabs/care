import { Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import type {
  DoctorPatientDocument,
  DoctorPatientSource,
  DoctorPatientStatus,
} from "../models/doctor-patient.model";

// ── Collection ref ─────────────────────────────────────────────────────────────
// Flat top-level collection: doctor_patients/{doctorId}_{patientId}

const col = db.collection("doctor_patients");

const docId = (doctorId: string, patientId: string) =>
  `${doctorId}_${patientId}`;

const docRef = (doctorId: string, patientId: string) =>
  col.doc(docId(doctorId, patientId));

// ── Repository ─────────────────────────────────────────────────────────────────

export const doctorPatientRepository = {
  /** Create a new pending invite. Idempotent — updates status if doc already exists. */
  async invite(input: {
    doctorId: string;
    patientId: string;
    source: DoctorPatientSource;
    patientName?: string;
  }): Promise<DoctorPatientDocument> {
    const now = Timestamp.now();
    const ref = docRef(input.doctorId, input.patientId);
    const snap = await ref.get();

    if (snap.exists) {
      const current = snap.data() as DoctorPatientDocument;
      // Never downgrade an already-accepted relationship back to pending.
      if (current.status === "accepted") {
        return current;
      }
      await ref.update(
        stripUndefined({
          status: "pending" as DoctorPatientStatus,
          invitedAt: now,
          acceptedAt: null,
          revokedAt: null,
          updatedAt: now,
          patientName: input.patientName,
          source: input.source,
        }),
      );
    } else {
      const newDoc: DoctorPatientDocument = {
        doctorId: input.doctorId,
        patientId: input.patientId,
        status: "pending",
        source: input.source,
        patientName: input.patientName,
        invitedAt: now,
        updatedAt: now,
      };
      await ref.set(stripUndefined(newDoc));
    }

    const updated = await ref.get();
    return updated.data() as DoctorPatientDocument;
  },

  async get(
    doctorId: string,
    patientId: string,
  ): Promise<DoctorPatientDocument | null> {
    const snap = await docRef(doctorId, patientId).get();
    if (!snap.exists) return null;
    return snap.data() as DoctorPatientDocument;
  },

  /** List all records for a doctor, optionally filtered by status */
  async listByDoctor(
    doctorId: string,
    status?: DoctorPatientStatus,
  ): Promise<DoctorPatientDocument[]> {
    const base = col.where("doctorId", "==", doctorId);
    const query = status
      ? base.where("status", "==", status).orderBy("invitedAt", "desc")
      : base.orderBy("invitedAt", "desc");
    const snap = await query.get();
    return snap.docs.map((d) => d.data() as DoctorPatientDocument);
  },

  /**
   * List all pending/accepted invites for a given patientId.
   * Simple where-clause on the flat doctor_patients collection.
   */
  async listByPatient(patientId: string): Promise<DoctorPatientDocument[]> {
    const snap = await col
      .where("patientId", "==", patientId)
      .where("status", "in", ["pending", "accepted"])
      .orderBy("invitedAt", "desc")
      .get();
    return snap.docs.map((d) => d.data() as DoctorPatientDocument);
  },

  async updateStatus(
    doctorId: string,
    patientId: string,
    status: DoctorPatientStatus,
  ): Promise<void> {
    const now = Timestamp.now();
    const updates: Record<string, unknown> = { status, updatedAt: now };
    if (status === "accepted") updates.acceptedAt = now;
    if (status === "revoked") updates.revokedAt = now;
    await docRef(doctorId, patientId).update(updates);
  },
};
