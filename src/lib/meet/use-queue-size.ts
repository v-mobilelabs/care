"use client";
/**
 * useQueueSize — subscribe to the number of patients waiting in a doctor's
 * call queue via RTDB `/queue-size/{doctorId}`.
 *
 * Returns 0 while loading or when no queue data exists.
 */
import { useRTDBListener } from "@/lib/firebase/use-rtdb-listener";

export function useQueueSize(doctorId: string | null | undefined): number {
  const { data } = useRTDBListener<number>(
    doctorId ? `queue-size/${doctorId}` : null,
  );

  return data ?? 0;
}
