// GET /api/credits — returns the current user's daily credit balance.
import { NextResponse } from "next/server";

import { type ApiContext, WithContext } from "@/lib/api/with-context";
import { GetUsageUseCase } from "@/data/usage";

export const dynamic = "force-dynamic";

const handler = async (ctx: ApiContext) => {
  const usage = await new GetUsageUseCase().execute({ profile: ctx.user.uid });
  return NextResponse.json({
    credits: usage.credits,
    minutes: usage.minutes,
    storage: usage.storage,
    lastReset: usage.lastReset,
  });
};

export const GET = WithContext(handler);
