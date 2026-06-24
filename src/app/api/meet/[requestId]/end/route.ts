import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { EndCallUseCase } from "@/data/meet/use-cases/call-actions.use-case";

// POST /api/meet/[requestId]/end — doctor or patient ends the call
export const POST = WithContext<{ requestId: string }>(
  async ({ user }, { requestId }) => {
    await new EndCallUseCase().execute({
      requestId,
      userId: user.uid,
    });

    return NextResponse.json({ ok: true });
  },
);
