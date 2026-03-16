import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { GetMeetingJoinInfoUseCase } from "@/data/meet";

// GET /api/meet/[requestId]/join — get Chime join credentials
export const GET = WithContext(
  async ({ user }, { requestId }: { requestId: string }) => {
    const joinInfo = await new GetMeetingJoinInfoUseCase().execute({
      requestId,
      userId: user.uid,
      userKind: user.kind,
    });

    return NextResponse.json(joinInfo);
  },
);
