import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { GetMeetingJoinInfoUseCase } from "@/data/meet";
import { meetRepository } from "@/data/meet/repositories/meet.repository";
import { buildConversationId } from "@/lib/messaging/conversation-id";
import type { MeetSessionData } from "@/app/(portal)/meet/[requestId]/_keys";

// GET /api/meet/[requestId]/session — full session data (join info + metadata)
// Used as a TanStack Query fallback when the SSR-hydrated cache is empty.
export const GET = WithContext(
  async ({ user }, { requestId }: { requestId: string }) => {
    const isDoctor = user.kind === "doctor";
    const fallback = isDoctor ? "/doctor/dashboard" : "/chat/connect";

    const [joinInfo, callRequest] = await Promise.all([
      new GetMeetingJoinInfoUseCase().execute({
        requestId,
        userId: user.uid,
      }),
      meetRepository.get(requestId),
    ]);

    const localName = callRequest
      ? isDoctor
        ? callRequest.doctorName
        : callRequest.patientName
      : isDoctor
        ? "Doctor"
        : "You";
    const localPhoto = callRequest
      ? isDoctor
        ? (callRequest.doctorPhotoUrl ?? null)
        : (callRequest.patientPhotoUrl ?? null)
      : null;
    const remoteName = callRequest
      ? isDoctor
        ? callRequest.patientName
        : callRequest.doctorName
      : isDoctor
        ? "Patient"
        : "Doctor";
    const remotePhoto = callRequest
      ? isDoctor
        ? (callRequest.patientPhotoUrl ?? null)
        : (callRequest.doctorPhotoUrl ?? null)
      : null;

    const session: MeetSessionData = {
      requestId,
      joinInfo,
      localUser: { name: localName, photoUrl: localPhoto },
      remoteUser: { name: remoteName, photoUrl: remotePhoto },
      exitRoute: fallback,
      userKind: isDoctor ? "doctor" : "patient",
      localUserId: user.uid,
      doctorId: callRequest?.doctorId ?? null,
      conversationId:
        callRequest?.doctorId && callRequest?.patientId
          ? buildConversationId(callRequest.doctorId, callRequest.patientId)
          : null,
      patientId: callRequest?.patientId ?? null,
    };

    return NextResponse.json(session);
  },
);
