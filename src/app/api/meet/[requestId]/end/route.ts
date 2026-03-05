import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { EndCallUseCase } from "@/data/meet";

// POST /api/meet/[requestId]/end — doctor or patient ends the call
export const POST = WithContext(
  async ({ user }, { requestId }: { requestId: string }) => {
    await new EndCallUseCase().execute({
      requestId,
      userId: user.uid,
    });

    return NextResponse.json({ ok: true });
  },
);
