/**
 * Server actions for referral lifecycle management.
 *
 * confirmReferral   — routes session to specialist + persists referral record as "accepted"
 * dismissReferral   — persists referral record as "dismissed" (user clicked Thank You)
 */

"use server";

import { revalidateTag } from "next/cache";
import { SetSessionAgentUseCase } from "@/data/sessions";
import { getServerUser } from "@/lib/api/server-prefetch";
import { referralService } from "@/data/referrals/service/referral.service";
import { CacheTags } from "@/data/cached";

export async function confirmReferral(
  sessionId: string,
  targetSpecialist: string,
  reason: string = "",
  reportLabel?: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await getServerUser();
    if (!user) {
      return { ok: false, error: "Not authenticated" };
    }

    await new SetSessionAgentUseCase().execute({
      userId: user.uid,
      profileId: user.uid,
      sessionId,
      agentType: targetSpecialist,
    });

    await referralService.createOrUpdateStatus(
      user.uid,
      sessionId,
      targetSpecialist,
      reason,
      reportLabel,
      "accepted",
    );

    revalidateTag(CacheTags.referrals(user.uid), "minutes");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function dismissReferral(
  sessionId: string,
  specialist: string,
  reason: string = "",
  reportLabel?: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await getServerUser();
    if (!user) {
      return { ok: false, error: "Not authenticated" };
    }

    await referralService.createOrUpdateStatus(
      user.uid,
      sessionId,
      specialist,
      reason,
      reportLabel,
      "dismissed",
    );

    revalidateTag(CacheTags.referrals(user.uid), "minutes");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * @deprecated Use dismissReferral instead — kept for backward-compat with ReferralCard.
 */
export async function closeSessionWithThankYou(
  _sessionId: string,
): Promise<{ ok: boolean; error?: string }> {
  // Without specialist/reason context we just return ok — the chat ReferralCard
  // will continue to call dismissReferral directly once callers are updated.
  return { ok: true };
}
