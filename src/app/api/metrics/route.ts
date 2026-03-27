import { NextResponse } from "next/server";
import { getCachedMetricsAggregated } from "@/data/cached";
import { ApiError, type ApiContext, WithContext } from "@/lib/api/with-context";
import { isAdminUser } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

const handler = async (ctx: ApiContext) => {
  const url = new URL(ctx.req.url);
  const profileId = url.searchParams.get("profileId");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  if (!profileId || !startDate || !endDate) {
    throw ApiError.badRequest(
      "Missing required params: profileId, startDate, endDate",
    );
  }

  if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
    throw ApiError.badRequest("startDate and endDate must be YYYY-MM-DD.");
  }

  if (!isAdminUser(ctx.user)) {
    throw ApiError.forbidden("Admin access required.");
  }

  const kpis = await getCachedMetricsAggregated(profileId, startDate, endDate);
  return NextResponse.json(kpis);
};

export const GET = WithContext(handler);
