import { meetRepository } from "../repositories/meet.repository";
import { rtdb, db } from "@/lib/firebase/admin";
import { deleteChimeMeeting } from "@/lib/meet/chime";
import { FieldValue } from "firebase-admin/firestore";
import { ApiError } from "@/lib/api/with-context";

export class RejectCallUseCase {
  async execute(params: {
    requestId: string;
    doctorId: string;
  }): Promise<void> {
    const { requestId, doctorId } = params;

    const request = await meetRepository.get(requestId);
    if (!request) throw ApiError.notFound("Call request not found.");
    if (request.doctorId !== doctorId)
      throw ApiError.forbidden("Not your call request.");
    if (request.status !== "pending")
      throw ApiError.badRequest(
        `Cannot reject a call with status "${request.status}".`,
      );

    await meetRepository.updateStatus(requestId, "rejected");

    await Promise.all([
      rtdb
        .ref(`call-state/${request.patientId}`)
        .update({ status: "rejected" }),
      rtdb.ref(`call-requests/${doctorId}/${requestId}`).remove(),
    ]);
  }
}

export class EndCallUseCase {
  async execute(params: { requestId: string; userId: string }): Promise<void> {
    const { requestId, userId } = params;

    const request = await meetRepository.get(requestId);
    if (!request) throw ApiError.notFound("Call request not found.");

    // Allow both doctor and patient to end the call
    if (request.doctorId !== userId && request.patientId !== userId) {
      throw ApiError.forbidden("You are not part of this call.");
    }

    if (request.status !== "accepted") {
      throw ApiError.badRequest(
        `Cannot end a call with status "${request.status}".`,
      );
    }

    // End Chime meeting
    if (request.chimeMeetingId) {
      try {
        await deleteChimeMeeting(request.chimeMeetingId);
      } catch {
        // Meeting may already be ended — ignore
      }
    }

    await meetRepository.updateStatus(requestId, "ended");

    // Update encounter record
    const encounterSnap = await db
      .collection("encounters")
      .where("requestId", "==", requestId)
      .limit(1)
      .get();

    if (!encounterSnap.empty) {
      await encounterSnap.docs[0]!.ref.update({
        status: "completed",
        endedAt: FieldValue.serverTimestamp(),
      });
    }

    await Promise.all([
      rtdb.ref(`call-state/${request.patientId}`).update({ status: "ended" }),
      rtdb.ref(`call-requests/${request.doctorId}/${requestId}`).remove(),
    ]);
  }
}

export class CancelCallUseCase {
  async execute(params: {
    requestId: string;
    patientId: string;
  }): Promise<void> {
    const { requestId, patientId } = params;

    const request = await meetRepository.get(requestId);
    if (!request) throw ApiError.notFound("Call request not found.");
    if (request.patientId !== patientId)
      throw ApiError.forbidden("Not your call request.");
    if (!["pending", "accepted"].includes(request.status)) {
      throw ApiError.badRequest(
        `Cannot cancel a call with status "${request.status}".`,
      );
    }

    if (request.chimeMeetingId) {
      try {
        await deleteChimeMeeting(request.chimeMeetingId);
      } catch {
        // ignore
      }
    }

    await meetRepository.updateStatus(requestId, "cancelled");

    await Promise.all([
      rtdb.ref(`call-state/${patientId}`).remove(),
      rtdb.ref(`call-requests/${request.doctorId}/${requestId}`).remove(),
    ]);
  }
}
