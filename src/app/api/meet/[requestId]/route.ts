import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import { GetMeetRequestUseCase } from "@/data/meet";

// GET /api/meet/[requestId] — fetch call request (must be a participant)
export const GET = WithContext(
  async ({ user }, { requestId }: { requestId: string }) => {
    const input = GetMeetRequestUseCase.validate({ requestId });
    const request = await new GetMeetRequestUseCase().execute(input);
    if (!request) throw ApiError.notFound("Call request not found.");

    if (request.doctorId !== user.uid && request.patientId !== user.uid) {
      throw ApiError.forbidden("You are not part of this call.");
    }

    return NextResponse.json(request);
  },
);
