import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { AcceptCallUseCase } from "@/data/meet";

// POST /api/meet/[requestId]/accept — doctor accepts the incoming call
export const POST = WithContext(
  { kind: "doctor" },
  async ({ user }, { requestId }: { requestId: string }) => {
    const joinInfo = await new AcceptCallUseCase().execute({
      requestId,
      doctorId: user.uid,
    });

    return NextResponse.json(joinInfo, { status: 200 });
  },
);
