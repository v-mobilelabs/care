import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { DeleteDoctorUseCase } from "@/data/doctors";

// DELETE /api/doctors/[doctorId]
export const DELETE = WithContext<{ doctorId: string }>(
  async ({ user }, { doctorId }) => {
    const input = DeleteDoctorUseCase.validate({ userId: user.uid, doctorId });
    await new DeleteDoctorUseCase().execute(input);
    return NextResponse.json({ ok: true });
  },
);
