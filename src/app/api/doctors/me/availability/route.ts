import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { UpdateAvailabilityUseCase } from "@/data/doctors";

// PATCH /api/doctors/me/availability — toggle check-in / check-out
export const PATCH = WithContext({ kind: "doctor" }, async ({ user, req }) => {
  const body = (await req.json()) as unknown;
  const input = UpdateAvailabilityUseCase.validate({
    ...(body as object),
    uid: user.uid,
  });
  const profile = await new UpdateAvailabilityUseCase().execute(input);
  return NextResponse.json(profile);
});
