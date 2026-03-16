import { after } from "next/server";
import { meetRepository } from "../repositories/meet.repository";
import { rtdb } from "@/lib/firebase/admin";
import { deleteChimeMeeting } from "@/lib/meet/chime";
import { ApiError } from "@/lib/api/with-context";
import { encounterRepository } from "@/data/encounters";
import { recomputeQueuePositions } from "./recompute-queue";

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
      // Update patient's call state to "rejected" so they are notified in
      // the waiting room. The patient-side listener will handle cleanup and
      // navigation after showing the rejection notification.
      rtdb
        .ref(`call-state/${request.patientId}`)
        .update({ status: "rejected" }),
      rtdb.ref(`call-requests/${doctorId}/${requestId}`).remove(),
    ]);

    // Recompute queue positions after the response — caller doesn't need the result.
    after(() => recomputeQueuePositions(doctorId).catch(console.error));
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

    // Already ended / cancelled / rejected — nothing to do.
    // This makes the endpoint idempotent so double-clicks or late
    // requests from both parties don't 400.
    if (["ended", "cancelled", "rejected", "missed"].includes(request.status)) {
      return;
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

    await Promise.all([
      rtdb.ref(`call-state/${request.patientId}`).update({ status: "ended" }),
      rtdb.ref(`call-requests/${request.doctorId}/${requestId}`).remove(),
      // Restore the doctor's presence status to online once the call is over
      rtdb.ref(`presence/${request.doctorId}`).update({ status: "online" }),
      // Write call-ended signal for both participants so the RTDB listener
      // on the other side fires even if the client-side write was missed.
      rtdb.ref(`call-ended/${requestId}/${userId}`).set(true),
    ]);

    // Deferred post-response work — neither blocks the caller.
    after(() =>
      encounterRepository.completeByRequestId(requestId).catch(console.error),
    );
    after(() => recomputeQueuePositions(request.doctorId).catch(console.error));
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
      // If the call was already accepted the doctor is marked busy — restore.
      ...(request.status === "accepted"
        ? [
            rtdb
              .ref(`presence/${request.doctorId}`)
              .update({ status: "online" }),
          ]
        : []),
    ]);

    // Recompute queue positions after the response — caller doesn't need the result.
    after(() => recomputeQueuePositions(request.doctorId).catch(console.error));
  }
}
