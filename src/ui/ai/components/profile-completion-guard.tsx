"use client";
import { useState } from "react";
import { useProfileQuery, usePatientQuery } from "@/ui/ai/query";
import { OnboardingModal } from "./onboarding-modal";

/**
 * ProfileCompletionGuard — Non-blocking soft-guard that prompts users
 * with incomplete profiles to fill in required details.
 *
 * Profiles are considered complete when ALL required fields are present:
 * - Identity: name, phone, gender, preferredLanguage, country, dateOfBirth
 * - Health: height, weight, activityLevel (for patient users only)
 */
export function ProfileCompletionGuard({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profileQuery = useProfileQuery();
  const patientQuery = usePatientQuery();
  const [isCompletingOnboarding, setIsCompletingOnboarding] = useState(false);

  // Determine if profile is complete (all required identity fields)
  const profileComplete = Boolean(
    profileQuery.data?.name &&
      profileQuery.data?.phone &&
      profileQuery.data?.gender &&
      profileQuery.data?.gender !== "Prefer not to say" &&
      profileQuery.data?.gender !== "prefer-not-to-say" &&
      profileQuery.data?.preferredLanguage &&
      profileQuery.data?.country &&
      profileQuery.data?.dateOfBirth,
  );

  // Determine if patient profile is complete (all required health fields)
  // Only matters if user is a patient (has patient record)
  const patientProfileComplete = Boolean(
    !patientQuery.data || // No patient record = skip health check (e.g., doctors)
      (patientQuery.data.height &&
        patientQuery.data.weight &&
        patientQuery.data.activityLevel),
  );

  const showModal =
    !isCompletingOnboarding &&
    !profileQuery.isLoading &&
    !patientQuery.isLoading &&
    (!profileComplete || !patientProfileComplete);

  return (
    <>
      <OnboardingModal
        opened={showModal}
        profileComplete={profileComplete}
        patientProfileComplete={patientProfileComplete}
        currentProfile={profileQuery.data}
        currentPatient={patientQuery.data}
        onComplete={() => {
          setIsCompletingOnboarding(true);
          // Refetch both queries to confirm completion before re-evaluating modal visibility
          void Promise.all([profileQuery.refetch(), patientQuery.refetch()]).finally(
            () => {
              setIsCompletingOnboarding(false);
            },
          );
        }}
      />
      {children}
    </>
  );
}
