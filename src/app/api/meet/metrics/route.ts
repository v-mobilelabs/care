// GET /api/meet/metrics — returns the current patient's monthly call usage.
import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { GetCallMetricsUseCase } from "@/data/meet";

export const GET = WithContext(async ({ user }) => {
  const metrics = await new GetCallMetricsUseCase().execute(
    GetCallMetricsUseCase.validate({ patientId: user.uid }),
  );
  return NextResponse.json(metrics);
});
