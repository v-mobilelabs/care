import { rtdb } from "@/lib/firebase/admin";

/**
 * Recompute queue positions for all pending call requests for a given doctor.
 * Sorts by createdAt and assigns sequential positions starting from 1.
 * Also updates each patient's call-state with their new position.
 */
export async function recomputeQueuePositions(doctorId: string): Promise<void> {
  const snap = await rtdb.ref(`call-requests/${doctorId}`).get();
  const data = snap.val() as Record<
    string,
    { status?: string; createdAt?: number; patientId?: string }
  > | null;

  if (!data) {
    // No entries left — clear the public queue-size counter
    await rtdb.ref(`queue-size/${doctorId}`).set(0);
    return;
  }

  const pending = Object.entries(data)
    .filter(([, v]) => v.status === "pending")
    .sort(([, a], [, b]) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

  // Build a single atomic multi-path update so every listener receives one
  // consistent snapshot instead of N intermediate re-renders.
  const flatUpdates: Record<string, unknown> = {};
  flatUpdates[`queue-size/${doctorId}`] = pending.length;

  for (let i = 0; i < pending.length; i++) {
    const [reqId, entry] = pending[i];
    const position = i + 1;
    flatUpdates[`call-requests/${doctorId}/${reqId}/queuePosition`] = position;
    if (entry.patientId) {
      flatUpdates[`call-state/${entry.patientId}/queuePosition`] = position;
    }
  }

  await rtdb.ref().update(flatUpdates);
}
