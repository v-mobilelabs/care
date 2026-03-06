/**
 * MeetPage — SSR page that pre-fetches Chime join credentials and call-request
 * metadata on the server, then hydrates TanStack Query so the client has the
 * data instantly without a second round-trip.
 *
 * On revisit (e.g. doctor clicks Dynamic Island), the client cache already has
 * the session data so the MeetingRoom mounts immediately. The SSR still runs
 * in the background to refresh the short-lived Chime token.
 */
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/api/server-prefetch";
import { GetMeetingJoinInfoUseCase } from "@/data/meet";
import { meetRepository } from "@/data/meet/repositories/meet.repository";
import { getQueryClient } from "@/lib/query/client";
import { Hydrate } from "@/ui/hydrate";
import { MeetContent } from "./_content";
import { meetSessionKey, type MeetSessionData } from "./_keys";

export default async function MeetPage({
    params,
}: Readonly<{ params: Promise<{ requestId: string }> }>) {
    const [user, { requestId }] = await Promise.all([
        getServerUser(),
        params,
    ]);

    if (!user) redirect("/auth/login");

    const isDoctor = user.kind === "doctor";
    const fallback = isDoctor ? "/doctor/dashboard" : "/chat/connect";

    // Fetch join credentials + call request metadata in parallel.
    const [joinInfoResult, callRequest] = await Promise.all([
        new GetMeetingJoinInfoUseCase()
            .execute({ requestId, userId: user.uid })
            .catch(() => null),
        meetRepository.get(requestId).catch(() => null),
    ]);

    if (!joinInfoResult) redirect(fallback);

    // Derive display names from the call request document.
    const localName = callRequest
        ? (isDoctor ? callRequest.doctorName : callRequest.patientName)
        : (isDoctor ? "Doctor" : "You");
    const localPhoto = callRequest
        ? (isDoctor ? (callRequest.doctorPhotoUrl ?? null) : (callRequest.patientPhotoUrl ?? null))
        : null;
    const remoteName = callRequest
        ? (isDoctor ? callRequest.patientName : callRequest.doctorName)
        : (isDoctor ? "Patient" : "Doctor");
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
        localUserId: user.uid,
        doctorId: callRequest?.doctorId ?? null,
    };

    const queryClient = getQueryClient();
    queryClient.setQueryData(meetSessionKey(requestId), sessionData);

    return (
        <Hydrate client={queryClient}>
            <MeetContent requestId={requestId} />
        </Hydrate>
    );
}
