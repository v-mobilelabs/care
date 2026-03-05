import { meetRepository } from "../repositories/meet.repository";
import { createChimeAttendee } from "@/lib/meet/chime";
import { ApiError } from "@/lib/api/with-context";
import type { AttendeeJoinInfo } from "../models/meet.model";

export class GetMeetingJoinInfoUseCase {
  async execute(params: {
    requestId: string;
    userId: string;
  }): Promise<AttendeeJoinInfo> {
    const { requestId, userId } = params;

    const request = await meetRepository.get(requestId);
    if (!request) throw ApiError.notFound("Call request not found.");

    if (request.doctorId !== userId && request.patientId !== userId) {
      throw ApiError.forbidden("You are not part of this call.");
    }

    if (request.status !== "accepted") {
      throw ApiError.badRequest("Meeting is not active.");
    }

    if (!request.chimeMeetingId || !request.chimeMeetingData) {
      throw ApiError.internal("Meeting data missing.");
    }

    const stored = JSON.parse(request.chimeMeetingData) as {
      meeting: AttendeeJoinInfo["meeting"];
      patientAttendee: AttendeeJoinInfo["attendee"];
      doctorAttendee: AttendeeJoinInfo["attendee"];
    };

    const isDoctor = request.doctorId === userId;
    const attendee = isDoctor ? stored.doctorAttendee : stored.patientAttendee;

    // Refresh join token (tokens are short-lived)
    const freshAttendee = await createChimeAttendee(
      request.chimeMeetingId,
      isDoctor ? `doctor-${userId}` : `patient-${userId}`,
    );

    return {
      meeting: stored.meeting,
      attendee: {
        AttendeeId: freshAttendee.AttendeeId ?? attendee.AttendeeId,
        ExternalUserId: freshAttendee.ExternalUserId ?? attendee.ExternalUserId,
        JoinToken: freshAttendee.JoinToken ?? attendee.JoinToken,
      },
      requestId,
    };
  }
}
