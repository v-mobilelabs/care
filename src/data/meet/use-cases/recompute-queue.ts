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

  const updates: Promise<void>[] = [];

  // Update the public queue-size counter so patients can see how many are waiting
  updates.push(
    rtdb
      .ref(`queue-size/${doctorId}`)
      .set(pending.length)
      .then(() => undefined),
  );

  for (let i = 0; i < pending.length; i++) {
    const [reqId, entry] = pending[i];
    const position = i + 1;

    updates.push(
      rtdb
        .ref(`call-requests/${doctorId}/${reqId}/queuePosition`)
        .set(position)
        .then(() => undefined),
    );

    if (entry.patientId) {
      updates.push(
        rtdb
          .ref(`call-state/${entry.patientId}/queuePosition`)
          .set(position)
          .then(() => undefined),
      );
    }
  }

  await Promise.all(updates);
}
