"use client";
/**
 * useQueueSize — subscribe to the number of patients waiting in a doctor's
 * call queue via RTDB `/queue-size/{doctorId}`.
 *
 * Returns 0 while loading or when no queue data exists.
 */
import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { getClientDatabase } from "@/lib/firebase/client";

export function useQueueSize(doctorId: string | null | undefined): number {
  const [size, setSize] = useState(0);

  useEffect(() => {
    if (!doctorId) {
      setSize(0);
      return;
    }

    const db = getClientDatabase();
    const queueRef = ref(db, `queue-size/${doctorId}`);

    const unsubscribe = onValue(queueRef, (snap) => {
      const val = snap.val() as number | null;
      setSize(val ?? 0);
    });

    return unsubscribe;
  }, [doctorId]);

  return size;
}
