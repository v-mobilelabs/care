/**
 * Formats user profile context into structured clientContent messages for Gemini Live.
 * Handles conversion of profile data into readable text for model context seeding.
 * Per SKILL.md: Use clientContent for initial seeded history, then switch to realtimeInput.
 */

export interface LiveUserProfileContext {
  readonly name?: string;
  readonly dateOfBirth?: string;
  readonly gender?: string;
  readonly city?: string;
  readonly country?: string;
  readonly heightCm?: number;
  readonly weightKg?: number;
  readonly activityLevel?: string;
  readonly bloodGroup?: string;
  readonly allergies?: readonly string[];
}

/**
 * Format patient profile into a structured clientContent message.
 * This message will be appended to conversation history before realtime input begins.
 * Returns the formatted message text, or null if profile is empty.
 */
export function formatLiveUserContext(
  profile: Readonly<LiveUserProfileContext>,
): string | null {
  if (!isProfilePopulated(profile)) {
    return null;
  }

  const sections: string[] = [
    "[PATIENT PROFILE - FOR REFERENCE]",
    "",
    "Personal Information:",
  ];

  // Personal identity
  const identity = buildIdentitySection(profile);
  if (identity) sections.push(identity);

  // Physical metrics
  const metrics = buildMetricsSection(profile);
  if (metrics) {
    sections.push("");
    sections.push("Physical Metrics:");
    sections.push(metrics);
  }

  // Clinical context
  const clinical = buildClinicalSection(profile);
  if (clinical) {
    sections.push("");
    sections.push("Clinical Context:");
    sections.push(clinical);
  }

  sections.push("");
  sections.push(
    "Use this information to personalize care. Ask clarifying questions about any changes to this profile.",
  );

  return sections.join("\n");
}

/**
 * Calculate age from ISO date string (YYYY-MM-DD).
 * Returns null if invalid or unreasonable.
 */
function calculateAge(dateOfBirth: string): number | null {
  try {
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 0 && age < 150 ? age : null;
  } catch {
    return null;
  }
}

/**
 * Calculate BMI from height (cm) and weight (kg).
 * Returns formatted BMI or null if inputs invalid.
 */
function calculateBMI(
  heightCm: number | undefined,
  weightKg: number | undefined,
): string | null {
  if (heightCm == null || weightKg == null || heightCm <= 0 || weightKg <= 0) {
    return null;
  }
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return `${bmi.toFixed(1)} (${getBMICategory(bmi)})`;
}

/**
 * Categorize BMI value.
 */
function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "healthy weight";
  if (bmi < 30) return "overweight";
  return "obese";
}

/**
 * Build identity section (name, age, gender, location).
 */
function buildIdentitySection(
  profile: Readonly<LiveUserProfileContext>,
): string | null {
  const parts: string[] = [];

  if (profile.name) {
    parts.push(`• Name: ${profile.name}`);
  }

  if (profile.dateOfBirth) {
    const age = calculateAge(profile.dateOfBirth);
    if (age != null) {
      parts.push(`• Age: ${age} years`);
    }
  }

  if (profile.gender) {
    parts.push(`• Gender: ${profile.gender}`);
  }

  if (profile.city || profile.country) {
    const location = [profile.city, profile.country].filter(Boolean).join(", ");
    if (location) {
      parts.push(`• Location: ${location}`);
    }
  }

  return parts.length > 0 ? parts.join("\n") : null;
}

/**
 * Build metrics section (height, weight, BMI, blood group, activity level).
 */
function buildMetricsSection(
  profile: Readonly<LiveUserProfileContext>,
): string | null {
  const parts: string[] = [];

  if (profile.heightCm) {
    parts.push(`• Height: ${profile.heightCm} cm`);
  }

  if (profile.weightKg) {
    parts.push(`• Weight: ${profile.weightKg} kg`);
  }

  const bmi = calculateBMI(profile.heightCm, profile.weightKg);
  if (bmi) {
    parts.push(`• BMI: ${bmi}`);
  }

  if (profile.bloodGroup) {
    parts.push(`• Blood Type: ${profile.bloodGroup}`);
  }

  if (profile.activityLevel) {
    parts.push(`• Activity Level: ${profile.activityLevel}`);
  }

  return parts.length > 0 ? parts.join("\n") : null;
}

/**
 * Build clinical context section (allergies, conditions, medications).
 */
function buildClinicalSection(
  profile: Readonly<LiveUserProfileContext>,
): string | null {
  const parts: string[] = [];

  if (profile.allergies && profile.allergies.length > 0) {
    parts.push(
      `• Allergies: ${profile.allergies.join(", ")} (IMPORTANT: avoid these in recommendations)`,
    );
  }

  return parts.length > 0 ? parts.join("\n") : null;
}

/**
 * Check if profile has any populated fields.
 */
function isProfilePopulated(
  profile: Readonly<LiveUserProfileContext>,
): boolean {
  return !!(
    profile.name ||
    profile.dateOfBirth ||
    profile.gender ||
    profile.city ||
    profile.country ||
    profile.heightCm ||
    profile.weightKg ||
    profile.activityLevel ||
    profile.bloodGroup ||
    (profile.allergies && profile.allergies.length > 0)
  );
}

/**
 * Build a personalized greeting using patient's first name and profile.
 * Returns concise greeting text ready for system instruction.
 */
export function buildLiveGreeting(
  profile: Readonly<LiveUserProfileContext>,
): string {
  const firstName = profile.name?.split(" ")[0] ?? "there";
  const age = profile.dateOfBirth ? calculateAge(profile.dateOfBirth) : null;
  const ageStr = age && age >= 0 ? ` (${age})` : "";

  return `Hi ${firstName}${ageStr}! I'm CareAI. How are you feeling today?`;
}

/**
 * Create a structured clientContent turn for the first interaction.
 * This message is appended to conversation history before realtime input.
 * Returns an object with role and text fields.
 */
export function createProfileContextTurn(
  profile: Readonly<LiveUserProfileContext>,
): { readonly role: "user" | "assistant"; readonly text: string } | null {
  const contextText = formatLiveUserContext(profile);
  if (!contextText) {
    return null;
  }

  return {
    role: "user",
    text: contextText,
  };
}
