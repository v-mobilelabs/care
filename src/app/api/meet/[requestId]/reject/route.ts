import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { RejectCallUseCase } from "@/data/meet";

// POST /api/meet/[requestId]/reject — doctor rejects the incoming call
export const POST = WithContext(
  { kind: "doctor" },
  async ({ user }, { requestId }: { requestId: string }) => {
    await new RejectCallUseCase().execute({
      requestId,
      doctorId: user.uid,
    });

    return NextResponse.json({ ok: true });
  },
);
