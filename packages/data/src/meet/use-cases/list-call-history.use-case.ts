import { meetRepository } from "../repositories/meet.repository";
import type { CallRequestDto } from "../models/meet.model";
import { getChimeMeetingAttendeeCount } from "@/lib/meet/chime";
import { rtdb } from "@/lib/firebase/admin";

/** Marks an active call as ended when Chime confirms nobody is in it. */
async function autoEndIfEmpty(call: CallRequestDto): Promise<CallRequestDto> {
  if (call.status !== "accepted") return call;

  // If a Chime meeting was never created, auto-end
  if (!call.chimeMeetingId) {
    await endAbandonedCall(call);
    return { ...call, status: "ended" };
  }

  const count = await getChimeMeetingAttendeeCount(call.chimeMeetingId);

  // null = meeting gone (Chime deleted it); 0 = meeting exists but empty
  if (count === null || count === 0) {
    await endAbandonedCall(call);
    return { ...call, status: "ended" };
  }

  return call;
}

async function endAbandonedCall(call: CallRequestDto): Promise<void> {
  await meetRepository.updateStatus(call.id, "ended");
  await Promise.all([
    rtdb.ref(`call-state/${call.patientId}`).update({ status: "ended" }),
    rtdb.ref(`call-requests/${call.doctorId}/${call.id}`).remove(),
  ]);
}

export class ListCallHistoryUseCase {
  async execute(params: {
    userId: string;
    kind: "patient" | "doctor";
    limit?: number;
  }): Promise<CallRequestDto[]> {
    const { userId, kind, limit } = params;

    const calls =
      kind === "doctor"
        ? await meetRepository.listByDoctor(userId, limit)
        : await meetRepository.listByPatient(userId, limit);

    // Auto-end any accepted calls where nobody is in the Chime meeting
    return Promise.all(calls.map(autoEndIfEmpty));
  }
}
