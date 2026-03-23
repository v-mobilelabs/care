import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { WithContext } from "@/lib/api/with-context";
import { WithdrawConsentUseCase } from "@/data/patients";
import { CacheTags } from "@/data/cached";

// DELETE /api/patients/me/consent — withdraw consent (clear consentedAt)
export const DELETE = WithContext(async ({ user }) => {
  await new WithdrawConsentUseCase().execute({ userId: user.uid });
  revalidateTag(CacheTags.patient(user.uid), "minutes");
  return NextResponse.json({ ok: true });
});
