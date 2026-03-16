import type { ProfileDto } from "../models/profile.model";

// ── Required Fields Configuration ─────────────────────────────────────────────

export interface ProfileFieldDefinition {
  key: keyof ProfileDto;
  label: string;
  description?: string;
}

/**
 * Essential fields required for basic profile completeness.
 * Used for onboarding flows and profile validation.
 */
export const RequiredProfileField: ReadonlyArray<ProfileFieldDefinition> = [
  {
    key: "name",
    label: "Full name",
    description: "User's full legal name",
  },
  {
    key: "phone",
    label: "Phone number",
    description: "Contact phone number",
  },
  {
    key: "dateOfBirth",
    label: "Date of birth",
    description: "User's birth date (YYYY-MM-DD)",
  },
  {
    key: "gender",
    label: "Gender",
    description: "Self-identified gender",
  },
  {
    key: "country",
    label: "Country",
    description: "Country of residence",
  },
] as const;

/**
 * Optional but recommended fields for enhanced profile data.
 */
export const OPTIONAL_PROFILE_FIELDS: ReadonlyArray<ProfileFieldDefinition> = [
  {
    key: "photoUrl",
    label: "Profile photo",
    description: "Profile picture URL",
  },
  {
    key: "city",
    label: "City",
    description: "City of residence",
  },
] as const;

// ── Helper Functions ──────────────────────────────────────────────────────────

/**
 * Returns the list of essential fields that are missing from the profile.
 * Empty array means all essential fields are present.
 *
 * @example
 * ```ts
 * const profile = await profileRepository.get(userId);
 * const missing = getMissingProfileFields(profile);
 * if (missing.length > 0) {
 *   console.log("Missing fields:", missing.map(f => f.label).join(", "));
 * }
 * ```
 */
export function getMissingProfileFields(
  profile: ProfileDto | null | undefined,
): ReadonlyArray<ProfileFieldDefinition> {
  if (!profile) return [...RequiredProfileField];

  return RequiredProfileField.filter((field) => {
    const value = profile[field.key];
    return value === undefined || value === null || value === "";
  });
}

/**
 * Returns the list of optional fields that are missing from the profile.
 *
 * @example
 * ```ts
 * const profile = await profileRepository.get(userId);
 * const missingOptional = getMissingOptionalFields(profile);
 * // Use for profile completion progress indicators
 * ```
 */
export function getMissingOptionalFields(
  profile: ProfileDto | null | undefined,
): ReadonlyArray<ProfileFieldDefinition> {
  if (!profile) return [...OPTIONAL_PROFILE_FIELDS];

  return OPTIONAL_PROFILE_FIELDS.filter((field) => {
    const value = profile[field.key];
    return value === undefined || value === null || value === "";
  });
}

/**
 * Checks if the profile has all essential fields populated.
 *
 * @example
 * ```ts
 * const profile = await profileRepository.get(userId);
 * if (!isProfileComplete(profile)) {
 *   // Redirect to onboarding
 * }
 * ```
 */
export function isProfileComplete(
  profile: ProfileDto | null | undefined,
): boolean {
  return getMissingProfileFields(profile).length === 0;
}

/**
 * Calculate profile completion percentage (0-100).
 * Includes both essential and optional fields.
 *
 * @example
 * ```ts
 * const profile = await profileRepository.get(userId);
 * const completion = getProfileCompletionPercentage(profile);
 * console.log(`Profile is ${completion}% complete`);
 * ```
 */
export function getProfileCompletionPercentage(
  profile: ProfileDto | null | undefined,
): number {
  if (!profile) return 0;

  const allFields = [...RequiredProfileField, ...OPTIONAL_PROFILE_FIELDS];

  const filledCount = allFields.filter((field) => {
    const value = profile[field.key];
    return value !== undefined && value !== null && value !== "";
  }).length;

  return Math.round((filledCount / allFields.length) * 100);
}

/**
 * Returns a human-readable list of missing field labels.
 *
 * @example
 * ```ts
 * const profile = await profileRepository.get(userId);
 * const missingLabels = getMissingFieldLabels(profile);
 * // ["Full name", "Email address", "Phone number"]
 * ```
 */
export function getMissingFieldLabels(
  profile: ProfileDto | null | undefined,
): string[] {
  return getMissingProfileFields(profile).map((field) => field.label);
}

/**
 * Returns a human-readable summary of profile status.
 *
 * @example
 * ```ts
 * const profile = await profileRepository.get(userId);
 * const summary = getProfileStatusSummary(profile);
 * // { complete: false, missingCount: 3, missingLabels: [...], percentage: 62 }
 * ```
 */
export function getProfileStatusSummary(
  profile: ProfileDto | null | undefined,
): {
  complete: boolean;
  missingCount: number;
  missingLabels: string[];
  percentage: number;
} {
  const missingFields = getMissingProfileFields(profile);
  return {
    complete: missingFields.length === 0,
    missingCount: missingFields.length,
    missingLabels: missingFields.map((f) => f.label),
    percentage: getProfileCompletionPercentage(profile),
  };
}
