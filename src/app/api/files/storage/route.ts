import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { GetStorageMetricsUseCase } from "@/data/sessions";

// GET /api/files/storage — returns the authenticated user's storage usage metrics
export const GET = WithContext(async ({ user }) => {
  const metrics = await new GetStorageMetricsUseCase().execute({
    userId: user.uid,
  });
  return NextResponse.json(metrics);
});
