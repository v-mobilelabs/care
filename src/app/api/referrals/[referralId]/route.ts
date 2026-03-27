import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { CacheTags } from "@/data/cached";
import { DeleteReferralUseCase } from "@/data/referrals";
import { WithContext } from "@/lib/api/with-context";

// DELETE /api/referrals/[referralId]
export const DELETE = WithContext<{ referralId: string }>(
  async ({ user }, { referralId }) => {
    await new DeleteReferralUseCase().execute({
      userId: user.uid,
      referralId,
    });
    revalidateTag(CacheTags.referrals(user.uid), "minutes");
    return NextResponse.json({ ok: true });
  },
);
