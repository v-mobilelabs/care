/**
 * Application Constants — Shared dropdowns, options, and enums
 *
 * Single source of truth for gender, countries, dietary preferences,
 * activity levels, and other reusable constants across the app.
 */

// ── Gender ────────────────────────────────────────────────────────────────────

export const GENDERS = ["male", "female", "other"] as const;

export type Gender = (typeof GENDERS)[number];

export const GENDER_LABELS: Record<Gender, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
};

export const GENDER_OPTIONS = GENDERS.map((gender) => ({
  value: gender,
  label: GENDER_LABELS[gender],
}));

// For profile forms (more inclusive options)
export const PROFILE_GENDER_OPTIONS = [
  { value: "man", label: "Man" },
  { value: "woman", label: "Woman" },
  { value: "non-binary", label: "Non-binary" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
] as const;

// ── Dietary Preferences ───────────────────────────────────────────────────────

export const DIETARY_TYPES = ["veg", "non-veg", "vegan"] as const;

export type DietaryType = (typeof DIETARY_TYPES)[number];

export const DIETARY_TYPE_LABELS: Record<DietaryType, string> = {
  veg: "Vegetarian",
  "non-veg": "Non-Vegetarian",
  vegan: "Vegan",
};

export const DIETARY_TYPE_OPTIONS = DIETARY_TYPES.map((type) => ({
  value: type,
  label: DIETARY_TYPE_LABELS[type],
}));

// For forms that use full words
export const FOOD_PREFERENCES = [
  "Vegetarian",
  "Non-vegetarian",
  "Vegan",
  "Pescatarian",
  "No preference",
] as const;

export const FOOD_PREFERENCE_OPTIONS = FOOD_PREFERENCES.map((pref) => ({
  value: pref.toLowerCase().replace("-", "_"),
  label: pref,
}));

// ── Activity Levels ───────────────────────────────────────────────────────────

export const ACTIVITY_LEVELS = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
] as const;

export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary (little or no exercise)",
  light: "Light (exercise 1-3 days/week)",
  moderate: "Moderate (exercise 3-5 days/week)",
  active: "Active (exercise 6-7 days/week)",
  very_active: "Very Active (intense exercise daily)",
};

export const ACTIVITY_LEVEL_OPTIONS = ACTIVITY_LEVELS.map((level) => ({
  value: level,
  label: ACTIVITY_LEVEL_LABELS[level],
}));

// ── Regions ───────────────────────────────────────────────────────────────────

export const REGIONS = [
  "South Asian",
  "East Asian",
  "Southeast Asian",
  "Middle Eastern",
  "Mediterranean",
  "European",
  "North American",
  "Latin American",
  "African",
  "Global",
] as const;

export type Region = (typeof REGIONS)[number];

export const REGION_OPTIONS = REGIONS.map((region) => ({
  value: region,
  label: region,
}));

// ── Countries ─────────────────────────────────────────────────────────────────

export const COUNTRIES = [
  // South Asia
  "India",
  "Pakistan",
  "Bangladesh",
  "Sri Lanka",
  "Nepal",
  "Bhutan",
  "Maldives",
  // East Asia
  "China",
  "Japan",
  "South Korea",
  "Taiwan",
  "Mongolia",
  // Southeast Asia
  "Singapore",
  "Malaysia",
  "Indonesia",
  "Thailand",
  "Philippines",
  "Vietnam",
  "Myanmar",
  "Cambodia",
  "Laos",
  "Brunei",
  // Middle East
  "United Arab Emirates",
  "Saudi Arabia",
  "Qatar",
  "Kuwait",
  "Oman",
  "Bahrain",
  "Jordan",
  "Lebanon",
  "Israel",
  "Turkey",
  "Iran",
  // Europe
  "United Kingdom",
  "Germany",
  "France",
  "Italy",
  "Spain",
  "Netherlands",
  "Belgium",
  "Switzerland",
  "Austria",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Poland",
  "Portugal",
  "Greece",
  "Ireland",
  // North America
  "United States",
  "Canada",
  "Mexico",
  // Latin America
  "Brazil",
  "Argentina",
  "Chile",
  "Colombia",
  "Peru",
  "Venezuela",
  "Ecuador",
  // Africa
  "South Africa",
  "Nigeria",
  "Kenya",
  "Egypt",
  "Morocco",
  "Ghana",
  "Ethiopia",
  // Oceania
  "Australia",
  "New Zealand",
] as const;

export type Country = (typeof COUNTRIES)[number];

export const COUNTRY_OPTIONS = COUNTRIES.map((country) => ({
  value: country,
  label: country,
}));

// ── Diet Goals ────────────────────────────────────────────────────────────────

export const DIET_GOALS = [
  "weight-loss",
  "weight-gain",
  "maintenance",
  "muscle-gain",
] as const;

export type DietGoal = (typeof DIET_GOALS)[number];

export const DIET_GOAL_LABELS: Record<DietGoal, string> = {
  "weight-loss": "Weight Loss",
  "weight-gain": "Weight Gain",
  maintenance: "Maintenance",
  "muscle-gain": "Muscle Gain",
};

export const DIET_GOAL_OPTIONS = DIET_GOALS.map((goal) => ({
  value: goal,
  label: DIET_GOAL_LABELS[goal],
}));

// ── Blood Groups ──────────────────────────────────────────────────────────────

export const BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
] as const;

export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export const BLOOD_GROUP_OPTIONS = BLOOD_GROUPS.map((group) => ({
  value: group,
  label: group,
}));
