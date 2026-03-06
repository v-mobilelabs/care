import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import type {
  EncounterDocument,
  EncounterDto,
  EncounterStatus,
  CreateEncounterInput,
} from "../models/encounter.model";
import { toEncounterDto } from "../models/encounter.model";

const COL = "encounters";

export const encounterRepository = {
  // ── Create ────────────────────────────────────────────────────────────────

  async create(data: CreateEncounterInput): Promise<EncounterDto> {
    const ref = db.collection(COL).doc();
    const now = FieldValue.serverTimestamp();
    const doc = {
      patientId: data.patientId,
      patientName: data.patientName,
      patientPhotoUrl: data.patientPhotoUrl ?? null,
      doctorId: data.doctorId,
      doctorName: data.doctorName,
      doctorPhotoUrl: data.doctorPhotoUrl ?? null,
      requestId: data.requestId,
      chimeMeetingId: data.chimeMeetingId,
      status: "active" as EncounterStatus,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await ref.set(doc);
    const snap = await ref.get();
    return toEncounterDto(snap.id, snap.data() as EncounterDocument);
  },

  // ── Get by ID ─────────────────────────────────────────────────────────────

  async get(encounterId: string): Promise<EncounterDto | null> {
    const snap = await db.collection(COL).doc(encounterId).get();
    if (!snap.exists) return null;
    return toEncounterDto(snap.id, snap.data() as EncounterDocument);
  },

  // ── Get by requestId ──────────────────────────────────────────────────────

  async getByRequestId(requestId: string): Promise<EncounterDto | null> {
    const snap = await db
      .collection(COL)
      .where("requestId", "==", requestId)
      .limit(1)
      .get();

    if (snap.empty) return null;
    const d = snap.docs[0]!;
    return toEncounterDto(d.id, d.data() as EncounterDocument);
  },

  // ── Complete encounter ────────────────────────────────────────────────────

  async complete(encounterId: string, durationSeconds?: number): Promise<void> {
    await db
      .collection(COL)
      .doc(encounterId)
      .update({
        status: "completed" as EncounterStatus,
        ...(durationSeconds != null && { durationSeconds }),
        endedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
  },

  // ── Complete by requestId ─────────────────────────────────────────────────

  async completeByRequestId(
    requestId: string,
    durationSeconds?: number,
  ): Promise<void> {
    const snap = await db
      .collection(COL)
      .where("requestId", "==", requestId)
      .limit(1)
      .get();

    if (snap.empty) return;
    await snap.docs[0]!.ref.update({
      status: "completed" as EncounterStatus,
      ...(durationSeconds != null && { durationSeconds }),
      endedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  },

  // ── Update notes ──────────────────────────────────────────────────────────

  async updateNotes(encounterId: string, notes: string): Promise<void> {
    await db.collection(COL).doc(encounterId).update({
      notes,
      updatedAt: FieldValue.serverTimestamp(),
    });
  },

  // ── List for doctor ───────────────────────────────────────────────────────

  async listByDoctor(doctorId: string, limit = 50): Promise<EncounterDto[]> {
    const snap = await db
      .collection(COL)
      .where("doctorId", "==", doctorId)
      .orderBy("startedAt", "desc")
      .limit(limit)
      .get();

    return snap.docs.map((d) =>
      toEncounterDto(d.id, d.data() as EncounterDocument),
    );
  },

  // ── List for patient ──────────────────────────────────────────────────────

  async listByPatient(patientId: string, limit = 50): Promise<EncounterDto[]> {
    const snap = await db
      .collection(COL)
      .where("patientId", "==", patientId)
      .orderBy("startedAt", "desc")
      .limit(limit)
      .get();

    return snap.docs.map((d) =>
      toEncounterDto(d.id, d.data() as EncounterDocument),
    );
  },

  // ── List for a specific doctor-patient pair ───────────────────────────────

  async listByDoctorAndPatient(
    doctorId: string,
    patientId: string,
    limit = 50,
  ): Promise<EncounterDto[]> {
    const snap = await db
      .collection(COL)
      .where("doctorId", "==", doctorId)
      .where("patientId", "==", patientId)
      .orderBy("startedAt", "desc")
      .limit(limit)
      .get();

    return snap.docs.map((d) =>
      toEncounterDto(d.id, d.data() as EncounterDocument),
    );
  },
};
