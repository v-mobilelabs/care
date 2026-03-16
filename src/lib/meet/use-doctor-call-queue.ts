"use client";
/**
 * useDoctorCallQueue — subscribes to incoming call requests for the logged-in doctor.
 * Listens to Firebase RTDB: /call-requests/{doctorId}
 */
import { useEffect, useState } from "react";
import { useRTDBListener } from "@/lib/firebase/use-rtdb-listener";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { firebaseApp } from "@/lib/firebase/client";

export interface IncomingCallEntry {
  requestId: string;
  patientId: string;
  patientName: string;
  patientPhotoUrl?: string | null;
  status: "pending" | "accepted";
  createdAt: number;
}

export function useDoctorCallQueue(
  doctorId: string | null | undefined,
): IncomingCallEntry[] {
  const [authReady, setAuthReady] = useState(false);

  // Wait for Firebase client Auth to be ready
  useEffect(() => {
    if (!doctorId) return;

    const unsubscribeAuth = onAuthStateChanged(
      getAuth(firebaseApp),
      (firebaseUser) => {
        setAuthReady(!!firebaseUser && firebaseUser.uid === doctorId);
      },
    );

    return () => {
      unsubscribeAuth();
      setAuthReady(false);
    };
  }, [doctorId]);

  const { data, error } = useRTDBListener<Record<string, IncomingCallEntry>>(
    authReady && doctorId ? `call-requests/${doctorId}` : null,
  );

  if (error) {
    console.warn("[useDoctorCallQueue] RTDB error:", error.message);
  }

  if (!data) return [];

  return Object.values(data)
    .filter((e) => e.status === "pending" || e.status === "accepted")
    .sort((a, b) => a.createdAt - b.createdAt);
}
