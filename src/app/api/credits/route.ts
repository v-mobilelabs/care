// GET /api/credits — returns the current user's daily credit balance.
import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { GetCreditsUseCase } from "@/data/credits";

export const GET = WithContext(async ({ user }) => {
  const credits = await new GetCreditsUseCase().execute(
    GetCreditsUseCase.validate({ userId: user.uid }),
  );
  return NextResponse.json(credits);
});
