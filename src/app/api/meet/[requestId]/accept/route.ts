import { NextResponse, after } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { AcceptCallUseCase } from "@/data/meet";

// POST /api/meet/[requestId]/accept — doctor accepts the incoming call
export const POST = WithContext(
  { kind: "doctor" },
  async ({ user }, { requestId }: { requestId: string }) => {
    const { joinInfo, deferredWork } = await new AcceptCallUseCase().execute({
      requestId,
      doctorId: user.uid,
    });

    // Run non-critical work (consent invite, encounter, DM, queue recompute)
    // after the response is sent — keeps the accept fast for the doctor.
    after(deferredWork);

    return NextResponse.json(joinInfo, { status: 200 });
  },
);
