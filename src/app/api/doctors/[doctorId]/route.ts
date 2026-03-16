import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { DeleteDoctorUseCase } from "@/data/doctors";

// DELETE /api/doctors/[doctorId]
export const DELETE = WithContext<{ doctorId: string }>(
  async ({ user }, { doctorId }) => {
    await new DeleteDoctorUseCase().execute({ userId: user.uid, doctorId });
    return NextResponse.json({ ok: true });
  },
);
