"use client";
/**
 * useCallState — subscribes to the patient's call state in Firebase RTDB.
 * Listens to: /call-state/{patientId}
 *
 * Subscription is deferred until Firebase client Auth is confirmed to avoid
 * silent permission-denied failures before the client SDK is authenticated.
 */
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { firebaseApp } from "@/lib/firebase/client";
import { useRTDBListener } from "@/lib/firebase/use-rtdb-listener";
import type { AttendeeJoinInfo } from "@/data/meet";

export type CallStatus =
  | "idle"
  | "pending"
  | "accepted"
  | "rejected"
  | "ended"
  | "cancelled";

export interface CallState {
  status: CallStatus;
  requestId?: string;
  doctorId?: string;
  doctorName?: string;
  chimeMeetingId?: string;
  joinInfo?: AttendeeJoinInfo | null;
  queuePosition?: number;
}

const INITIAL: CallState = { status: "idle" };

export function useCallState(patientId: string | null | undefined): CallState {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!patientId) return;

    const unsubscribeAuth = onAuthStateChanged(
      getAuth(firebaseApp),
      (firebaseUser) => {
        setAuthReady(!!firebaseUser && firebaseUser.uid === patientId);
      },
    );

    return () => {
      unsubscribeAuth();
      setAuthReady(false);
    };
  }, [patientId]);

  const { data } = useRTDBListener<
    Omit<CallState, "joinInfo"> & {
      attendeeId?: string;
      joinToken?: string;
      meeting?: AttendeeJoinInfo["meeting"];
      queuePosition?: number;
      doctorName?: string;
    }
  >(authReady && patientId ? `call-state/${patientId}` : null);

  if (!data) {
    return INITIAL;
  }

  const joinInfo: AttendeeJoinInfo | null =
    data.status === "accepted" &&
    data.attendeeId &&
    data.joinToken &&
    data.meeting
      ? {
          meeting: data.meeting,
          attendee: {
            AttendeeId: data.attendeeId,
            ExternalUserId: `patient-${patientId}`,
            JoinToken: data.joinToken,
          },
          requestId: data.requestId ?? "",
        }
      : null;

  return {
    status: (data.status as CallStatus) ?? "idle",
    requestId: data.requestId,
    doctorId: data.doctorId,
    doctorName: data.doctorName,
    chimeMeetingId: data.chimeMeetingId,
    joinInfo,
    queuePosition: data.queuePosition,
  };
}
