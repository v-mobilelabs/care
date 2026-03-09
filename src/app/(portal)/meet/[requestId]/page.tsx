/**
 * MeetPage — SSR page that pre-fetches Chime join credentials and call-request
 * metadata on the server, then hydrates TanStack Query so the client has the
 * data instantly without a second round-trip.
 *
 * Uses Next.js streaming: the outer Suspense shell renders the animated
 * loading skeleton immediately while the async data fetch resolves in the
 * background and streams down. This means the user sees UI instantly instead
 * of staring at a blank screen.
 *
 * On revisit (e.g. doctor clicks Dynamic Island), the client cache already has
 * the session data so the MeetingRoom mounts immediately. The SSR still runs
 * in the background to refresh the short-lived Chime token.
 *
 * **Pending calls**: When a patient navigates here before the doctor has
 * accepted, `joinInfo` will be null. The client-side `MeetContent` handles
 * this by showing a combined waiting-room + camera-preview lobby. Once the
 * doctor accepts, RTDB pushes the join credentials and the client transitions
 * seamlessly into the pre-join lobby.
 */
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/api/server-prefetch";
import { GetMeetingJoinInfoUseCase } from "@/data/meet";
import { meetRepository } from "@/data/meet/repositories/meet.repository";
import { buildConversationId } from "@/lib/messaging/conversation-id";
import { getQueryClient } from "@/lib/query/client";
import { Hydrate } from "@/ui/hydrate";
import { MeetContent } from "./_content";
import { meetSessionKey, type MeetSessionData } from "./_keys";
import MeetLoading from "./loading";

/**
 * Inner async component that fetches Chime credentials and hydrates the
 * TanStack cache. Wrapped in Suspense so the loading skeleton streams first.
 */
async function MeetData({
    requestId,
    userId,
    userKind,
    fallback,
}: Readonly<{
    requestId: string;
    userId: string;
    userKind: "doctor" | "patient";
    fallback: string;
}>) {
    const isDoctor = userKind === "doctor";

    // Fetch join credentials + call request metadata in parallel.
    const [joinInfoResult, callRequest] = await Promise.all([
        new GetMeetingJoinInfoUseCase()
            .execute({ requestId, userId })
            .catch(() => null),
        meetRepository.get(requestId).catch(() => null),
    ]);

    // Doctors must have join info — redirect on failure.
    // Patients can arrive while the call is still pending (joinInfo will be null).
    if (!joinInfoResult && isDoctor) redirect(fallback);
    if (!joinInfoResult && !callRequest) redirect(fallback);

    // Derive display names — extract to avoid nested ternaries.
    const localName = (() => {
        if (!callRequest) return isDoctor ? "Doctor" : "You";
        return isDoctor ? callRequest.doctorName : callRequest.patientName;
    })();
    const localPhoto = callRequest
        ? (isDoctor ? (callRequest.doctorPhotoUrl ?? null) : (callRequest.patientPhotoUrl ?? null))
        : null;
    const remoteName = (() => {
        if (!callRequest) return isDoctor ? "Patient" : "Doctor";
        return isDoctor ? callRequest.patientName : callRequest.doctorName;
    })();
    const remotePhoto = callRequest
        ? (isDoctor ? (callRequest.patientPhotoUrl ?? null) : (callRequest.doctorPhotoUrl ?? null))
        : null;

    // Build session data and seed the TanStack Query cache so the client
    // has it instantly — no extra API call on mount or revisit.
    const sessionData: MeetSessionData = {
        requestId,
        joinInfo: joinInfoResult,
        localUser: { name: localName, photoUrl: localPhoto },
        remoteUser: { name: remoteName, photoUrl: remotePhoto },
        exitRoute: fallback,
        userKind: isDoctor ? "doctor" : "patient",
        localUserId: userId,
        doctorId: callRequest?.doctorId ?? null,
        conversationId:
            callRequest?.doctorId && callRequest?.patientId
                ? buildConversationId(callRequest.doctorId, callRequest.patientId)
                : null,
        patientId: callRequest?.patientId ?? null,
    };

    const queryClient = getQueryClient();
    queryClient.setQueryData(meetSessionKey(requestId), sessionData);

    return (
        <Hydrate client={queryClient}>
            <MeetContent requestId={requestId} />
        </Hydrate>
    );
}

export default async function MeetPage({
    params,
}: Readonly<{ params: Promise<{ requestId: string }> }>) {
    // Auth check is fast — resolve it before entering Suspense.
    const [user, { requestId }] = await Promise.all([
        getServerUser(),
        params,
    ]);

    if (!user) redirect("/auth/login");

    const isDoctor = user.kind === "doctor";
    const fallback = isDoctor ? "/doctor/dashboard" : "/patient/connect";

    // Stream: render animated skeleton immediately while data loads.
    return (
        <Suspense fallback={<MeetLoading />}>
            <MeetData
                requestId={requestId}
                userId={user.uid}
                userKind={isDoctor ? "doctor" : "patient"}
                fallback={fallback}
            />
        </Suspense>
    );
}
