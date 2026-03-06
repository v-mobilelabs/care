import type { AttendeeJoinInfo } from "@/data/meet";

/** Participant display info passed to the meeting room. */
export interface MeetParticipant {
  name: string;
  photoUrl: string | null;
}

/** All data needed to render the meeting room — cached as a single query. */
export interface MeetSessionData {
  requestId: string;
  joinInfo: AttendeeJoinInfo;
  localUser: MeetParticipant;
  remoteUser: MeetParticipant;
  exitRoute: string;
  userKind: "doctor" | "patient";
  localUserId: string;
  doctorId: string | null;
}

/** TanStack Query key for meet session data. */
export const meetSessionKey = (requestId: string) =>
  ["meet-session", requestId] as const;
