"use client";
import { useState } from "react";
import { useProfileQuery } from "@/ui/ai/query";
import { OnboardingTour } from "./onboarding-tour";

/**
 * OnboardingTourGuard — Shows an interactive onboarding tour to users
 * who have completed their profile but haven't yet completed the tour.
 *
 * The tour is skippable (hides for this session only) or completable
 * (persists to DB via POST /api/profile/onboarding-tour/complete).
 */
export function OnboardingTourGuard({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profileQuery = useProfileQuery();
  const [dismissedForSession, setDismissedForSession] = useState(false);
  const [isCompletingTour, setIsCompletingTour] = useState(false);

  // Profile is considered complete when required identity fields are present
  const profileComplete = Boolean(
    profileQuery.data &&
      profileQuery.data.name &&
      profileQuery.data.phone &&
      profileQuery.data.gender &&
      profileQuery.data.country &&
      profileQuery.data.dateOfBirth
  );

  // Show tour if profile is complete, tour is not completed, and not dismissed in this session.
  const showTour =
    !dismissedForSession &&
    !isCompletingTour &&
    !profileQuery.isLoading &&
    profileComplete &&
    !profileQuery.data?.onboardingTourCompleted;

  const handleComplete = async () => {
    setIsCompletingTour(true);
    setDismissedForSession(true);
    try {
      const response = await fetch("/api/profile/onboarding-tour/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to mark tour as complete");
      }

      // Refetch profile to confirm completion
      await profileQuery.refetch();
    } catch (err) {
      console.error("Error completing onboarding tour:", err);
      setDismissedForSession(false);
    } finally {
      setIsCompletingTour(false);
    }
  };

  return (
    <>
      <OnboardingTour
        opened={showTour}
        onClose={() => setDismissedForSession(true)}
        onComplete={handleComplete}
      />
      {children}
    </>
  );
}
