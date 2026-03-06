import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import { meetRepository } from "@/data/meet/repositories/meet.repository";

// GET /api/meet/[requestId] — fetch call request (must be a participant)
export const GET = WithContext(
  async ({ user }, { requestId }: { requestId: string }) => {
    const request = await meetRepository.get(requestId);
    if (!request) throw ApiError.notFound("Call request not found.");

    if (request.doctorId !== user.uid && request.patientId !== user.uid) {
      throw ApiError.forbidden("You are not part of this call.");
    }

    return NextResponse.json(request);
  },
);
