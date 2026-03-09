import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import type {
  CallRequestDocument,
  CallRequestDto,
  CallRequestStatus,
} from "../models/meet.model";
import { toCallRequestDto } from "../models/meet.model";

const COL = "meet-requests";

export const meetRepository = {
  // ── Create ────────────────────────────────────────────────────────────────

  async create(data: {
    patientId: string;
    patientName: string;
    patientPhotoUrl?: string | null;
    doctorId: string;
    doctorName: string;
  }): Promise<CallRequestDto> {
    const ref = db.collection(COL).doc();
    const now = FieldValue.serverTimestamp();
    const doc: Omit<CallRequestDocument, "createdAt" | "updatedAt"> & {
      createdAt: FieldValue;
      updatedAt: FieldValue;
    } = {
      patientId: data.patientId,
      patientName: data.patientName,
      patientPhotoUrl: data.patientPhotoUrl ?? null,
      doctorId: data.doctorId,
      doctorName: data.doctorName,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    await ref.set(doc);
    const snap = await ref.get();
    return toCallRequestDto(ref.id, snap.data() as CallRequestDocument);
  },

  // ── Get ───────────────────────────────────────────────────────────────────

  async get(requestId: string): Promise<CallRequestDto | null> {
    const snap = await db.collection(COL).doc(requestId).get();
    if (!snap.exists) return null;
    return toCallRequestDto(snap.id, snap.data() as CallRequestDocument);
  },

  // ── Update status ─────────────────────────────────────────────────────────

  async updateStatus(
    requestId: string,
    status: CallRequestStatus,
    extra?: {
      chimeMeetingId?: string;
      chimeMeetingData?: string;
      doctorPhotoUrl?: string | null;
    },
  ): Promise<void> {
    await db
      .collection(COL)
      .doc(requestId)
      .update({
        status,
        ...(extra?.chimeMeetingId && { chimeMeetingId: extra.chimeMeetingId }),
        ...(extra?.chimeMeetingData && {
          chimeMeetingData: extra.chimeMeetingData,
        }),
        ...(extra?.doctorPhotoUrl != null && {
          doctorPhotoUrl: extra.doctorPhotoUrl,
        }),
        updatedAt: FieldValue.serverTimestamp(),
      });
  },

  // ── Save recording metadata (called after upload completes) ───────────────

  async saveRecording(
    requestId: string,
    data: { recordingUrl: string; durationSeconds: number },
  ): Promise<void> {
    await db.collection(COL).doc(requestId).update({
      recordingUrl: data.recordingUrl,
      durationSeconds: data.durationSeconds,
      updatedAt: FieldValue.serverTimestamp(),
    });
  },

  // ── List pending for doctor ───────────────────────────────────────────────

  async listPendingForDoctor(doctorId: string): Promise<CallRequestDto[]> {
    const snap = await db
      .collection(COL)
      .where("doctorId", "==", doctorId)
      .where("status", "==", "pending")
      .orderBy("createdAt", "asc")
      .get();

    return snap.docs.map((d) =>
      toCallRequestDto(d.id, d.data() as CallRequestDocument),
    );
  },

  // ── Get active call for patient ───────────────────────────────────────────

  async getActiveForPatient(patientId: string): Promise<CallRequestDto | null> {
    const snap = await db
      .collection(COL)
      .where("patientId", "==", patientId)
      .where("status", "in", ["pending", "accepted"])
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (snap.empty) return null;
    const d = snap.docs[0]!;
    return toCallRequestDto(d.id, d.data() as CallRequestDocument);
  },

  // ── List all calls for patient (history) ─────────────────────────────────

  async listByPatient(
    patientId: string,
    limit = 50,
  ): Promise<CallRequestDto[]> {
    const snap = await db
      .collection(COL)
      .where("patientId", "==", patientId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snap.docs.map((d) =>
      toCallRequestDto(d.id, d.data() as CallRequestDocument),
    );
  },

  // ── List all calls for doctor (history) ──────────────────────────────────

  async listByDoctor(doctorId: string, limit = 50): Promise<CallRequestDto[]> {
    const snap = await db
      .collection(COL)
      .where("doctorId", "==", doctorId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snap.docs.map((d) =>
      toCallRequestDto(d.id, d.data() as CallRequestDocument),
    );
  },

  // ── Count calls initiated by a patient in the current calendar month ──────

  async countByPatientThisMonth(patientId: string): Promise<number> {
    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const snap = await db
      .collection(COL)
      .where("patientId", "==", patientId)
      .where("createdAt", ">=", Timestamp.fromDate(monthStart))
      .get();
    return snap.size;
  },

  // ── Get active call for doctor ────────────────────────────────────────────

  async getActiveForDoctor(doctorId: string): Promise<CallRequestDto | null> {
    const snap = await db
      .collection(COL)
      .where("doctorId", "==", doctorId)
      .where("status", "==", "accepted")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (snap.empty) return null;
    const d = snap.docs[0]!;
    return toCallRequestDto(d.id, d.data() as CallRequestDocument);
  },
};
