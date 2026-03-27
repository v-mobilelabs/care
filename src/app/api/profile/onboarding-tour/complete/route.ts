import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { WithContext } from "@/lib/api/with-context";
import { MarkOnboardingTourCompleteUseCase } from "@/data/profile/use-cases/mark-onboarding-tour-complete.use-case";
import { CacheTags } from "@/data/cached";

// POST /api/profile/onboarding-tour/complete — mark onboarding tour as complete
export const POST = WithContext(async ({ user }) => {
  try {
    await new MarkOnboardingTourCompleteUseCase().execute({
      userId: user.uid,
    });

    revalidateTag(CacheTags.profile(user.uid), "max");

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error marking onboarding tour complete:", err);
    return NextResponse.json(
      { error: "Failed to mark onboarding tour as complete" },
      { status: 500 },
    );
  }
});
