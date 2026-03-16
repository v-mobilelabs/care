import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { GetMeetingJoinInfoUseCase } from "@/data/meet";

// GET /api/meet/[requestId]/session — full session data (join info + metadata)
// Used as a TanStack Query fallback when the SSR-hydrated cache is empty.
export const GET = WithContext(
  async ({ user }, { requestId }: { requestId: string }) => {
    const session = await new GetMeetingJoinInfoUseCase().execute({
      requestId,
      userId: user.uid,
      userKind: user.kind,
    });

    return NextResponse.json(session);
  },
);
