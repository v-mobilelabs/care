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
import { ref, onValue } from "firebase/database";
import { firebaseApp, getClientDatabase } from "@/lib/firebase/client";
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
  const [state, setState] = useState<CallState>(INITIAL);

  useEffect(() => {
    if (!patientId) {
      setState(INITIAL);
      return;
    }

    let unsubscribeRtdb: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(
      getAuth(firebaseApp),
      (firebaseUser) => {
        if (unsubscribeRtdb) {
          unsubscribeRtdb();
          unsubscribeRtdb = null;
        }

        if (!firebaseUser || firebaseUser.uid !== patientId) {
          setState(INITIAL);
          return;
        }

        const db = getClientDatabase();
        const callRef = ref(db, `call-state/${patientId}`);

        unsubscribeRtdb = onValue(
          callRef,
          (snap) => {
            const data = snap.val() as
              | (Omit<CallState, "joinInfo"> & {
                  attendeeId?: string;
                  joinToken?: string;
                  meeting?: AttendeeJoinInfo["meeting"];
                  queuePosition?: number;
                  doctorName?: string;
                })
              | null;

            if (!data) {
              setState(INITIAL);
              return;
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

            setState({
              status: (data.status as CallStatus) ?? "idle",
              requestId: data.requestId,
              doctorId: data.doctorId,
              doctorName: data.doctorName,
              chimeMeetingId: data.chimeMeetingId,
              joinInfo,
              queuePosition: data.queuePosition,
            });
          },
          (error) => {
            console.warn("[useCallState] RTDB error:", error.message);
            setState(INITIAL);
          },
        );
      },
    );

    return () => {
      unsubscribeAuth();
      if (unsubscribeRtdb) unsubscribeRtdb();
    };
  }, [patientId]);

  return state;
}
