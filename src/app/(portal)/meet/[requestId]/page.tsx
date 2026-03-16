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
import type { UserKind } from "@/lib/auth/jwt";
import { getQueryClient } from "@/lib/query/client";
import { Hydrate } from "@/ui/hydrate";
import { MeetContent } from "./_content";
import { meetSessionKey } from "./_keys";
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
    userKind: UserKind;
    fallback: string;
}>) {
    // Fetch complete session data (includes join credentials + metadata).
    // For doctors: requires active meeting (redirects on failure).
    // For patients: can arrive before doctor accepts (joinInfo will be null).
    const sessionData = await new GetMeetingJoinInfoUseCase()
        .execute({ requestId, userId, userKind })
        .catch(() => null);

    // Redirect on failure (forbidden, not found, or meeting not active for doctors)
    if (!sessionData) redirect(fallback);

    // Seed the TanStack Query cache so the client has data instantly —
    // no extra API call on mount or revisit.
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
                userKind={user.kind}
                fallback={fallback}
            />
        </Suspense>
    );
}
