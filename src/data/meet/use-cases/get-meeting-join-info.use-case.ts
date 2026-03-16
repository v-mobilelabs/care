import { meetRepository } from "../repositories/meet.repository";
import { createChimeAttendee } from "@/lib/meet/chime";
import { ApiError } from "@/lib/api/with-context";
import { buildConversationId } from "@/lib/messaging/conversation-id";
import type { AttendeeJoinInfo } from "../models/meet.model";
import type {
  MeetSessionData,
  MeetParticipant,
} from "@/app/(portal)/meet/[requestId]/_keys";
import type { UserKind } from "@/lib/auth/jwt";

type CallRequest = NonNullable<Awaited<ReturnType<typeof meetRepository.get>>>;

/** Build local/remote participant display info for a given perspective. */
function buildParticipants(
  request: CallRequest,
  isDoctor: boolean,
): { localUser: MeetParticipant; remoteUser: MeetParticipant } {
  if (isDoctor) {
    return {
      localUser: {
        name: request.doctorName,
        photoUrl: request.doctorPhotoUrl ?? null,
      },
      remoteUser: {
        name: request.patientName,
        photoUrl: request.patientPhotoUrl ?? null,
      },
    };
  }
  return {
    localUser: {
      name: request.patientName,
      photoUrl: request.patientPhotoUrl ?? null,
    },
    remoteUser: {
      name: request.doctorName,
      photoUrl: request.doctorPhotoUrl ?? null,
    },
  };
}

/** Refresh the Chime attendee join token. Throws if the meeting has been deleted. */
async function refreshJoinInfo(
  request: CallRequest,
  userId: string,
  isDoctor: boolean,
  requestId: string,
): Promise<AttendeeJoinInfo> {
  const stored = JSON.parse(request.chimeMeetingData!) as {
    meeting: AttendeeJoinInfo["meeting"];
    patientAttendee: AttendeeJoinInfo["attendee"];
    doctorAttendee: AttendeeJoinInfo["attendee"];
  };

  const storedAttendee = isDoctor
    ? stored.doctorAttendee
    : stored.patientAttendee;

  try {
    const fresh = await createChimeAttendee(
      request.chimeMeetingId!,
      isDoctor ? `doctor-${userId}` : `patient-${userId}`,
    );
    return {
      meeting: stored.meeting,
      attendee: {
        AttendeeId: fresh.AttendeeId ?? storedAttendee.AttendeeId,
        ExternalUserId: fresh.ExternalUserId ?? storedAttendee.ExternalUserId,
        JoinToken: fresh.JoinToken ?? storedAttendee.JoinToken,
      },
      requestId,
    };
  } catch (err) {
    console.error(
      "[GetMeetingJoinInfo] Failed to refresh attendee token:",
      err,
    );
    // Clean up the stale Firestore record so future queries don't keep hitting AWS
    await meetRepository
      .updateStatus(requestId, "ended")
      .catch(() => undefined);
    throw ApiError.badRequest("Meeting has ended or no longer exists.");
  }
}

export class GetMeetingJoinInfoUseCase {
  async execute(params: {
    requestId: string;
    userId: string;
    /** The kind of user making the request — "user" is the patient kind. */
    userKind: UserKind;
  }): Promise<MeetSessionData> {
    const { requestId, userId } = params;
    // Normalise "user" → "patient" for the session data kind field
    const userKind: "doctor" | "patient" =
      params.userKind === "doctor" ? "doctor" : "patient";

    const request = await meetRepository.get(requestId);
    if (!request) throw ApiError.notFound("Call request not found.");

    if (request.doctorId !== userId && request.patientId !== userId) {
      throw ApiError.forbidden("You are not part of this call.");
    }

    const isDoctor = request.doctorId === userId;
    const fallback = isDoctor ? "/doctor/dashboard" : "/patient/connect";
    const conversationId =
      request.doctorId && request.patientId
        ? buildConversationId(request.doctorId, request.patientId)
        : null;
    const shared = {
      requestId,
      exitRoute: fallback,
      userKind,
      localUserId: userId,
      doctorId: request.doctorId ?? null,
      conversationId,
      patientId: request.patientId ?? null,
      ...buildParticipants(request, isDoctor),
    };

    // Pending call — patient can wait; doctor must not enter yet
    if (request.status !== "accepted") {
      if (isDoctor) throw ApiError.badRequest("Meeting is not active.");
      return { ...shared, joinInfo: null };
    }

    if (!request.chimeMeetingId || !request.chimeMeetingData) {
      throw ApiError.internal("Meeting data missing.");
    }

    const joinInfo = await refreshJoinInfo(
      request,
      userId,
      isDoctor,
      requestId,
    );
    return { ...shared, joinInfo };
  }
}
