import { NextResponse } from "next/server";
import { WithContext, ApiError } from "@/lib/api/with-context";
import {
  AcceptInviteUseCase,
  DeclineInviteUseCase,
  InviteActionSchema,
} from "@/data/doctor-patients";

// POST /api/doctor-patients/invites/[doctorId]
// Body: { action: "accept" | "decline" }
export const POST = WithContext(
  {},
  async ({ user, req }, params: { doctorId: string }) => {
    const body = (await req.json()) as unknown;
    const parsed = InviteActionSchema.safeParse(body);
    if (!parsed.success) {
      throw ApiError.badRequest('action must be "accept" or "decline".');
    }

    if (parsed.data.action === "accept") {
      const input = AcceptInviteUseCase.validate({
        doctorId: params.doctorId,
        patientId: user.uid,
      });
      await new AcceptInviteUseCase().execute(input);
    } else {
      const input = DeclineInviteUseCase.validate({
        doctorId: params.doctorId,
        patientId: user.uid,
      });
      await new DeclineInviteUseCase().execute(input);
    }

    return NextResponse.json({ success: true });
  },
);
