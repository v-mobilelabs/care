import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import {
  UpdateInsuranceUseCase,
  DeleteInsuranceUseCase,
} from "@/data/insurance";

// PATCH /api/insurance/[insuranceId] — update an insurance record
export const PATCH = WithContext<{ insuranceId: string }>(
  async ({ user, req, dependentId }, { insuranceId }) => {
    const body = (await req.json()) as unknown;
    const input = UpdateInsuranceUseCase.validate({
      ...(body as object),
      userId: user.uid,
      insuranceId,
    });
    const record = await new UpdateInsuranceUseCase(dependentId).execute(input);
    return NextResponse.json(record);
  },
);

// DELETE /api/insurance/[insuranceId] — delete an insurance record (and its document)
export const DELETE = WithContext<{ insuranceId: string }>(
  async ({ user, dependentId }, { insuranceId }) => {
    const input = DeleteInsuranceUseCase.validate({
      userId: user.uid,
      insuranceId,
    });
    await new DeleteInsuranceUseCase(dependentId).execute(input);
    return NextResponse.json({ ok: true });
  },
);
