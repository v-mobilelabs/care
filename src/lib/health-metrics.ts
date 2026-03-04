/**
 * @file health-metrics.ts
 *
 * Pure, side-effect-free health metric calculations.
 * All inputs use SI units (kg, cm).  All outputs are plain numbers or
 * typed result objects — no Firestore / UI dependencies.
 *
 * Usage (client or server):
 *   import { calcBmi, calcBmr, calcTdee } from "@/lib/health-metrics";
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type BiologicalSex = "male" | "female";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

// ── Activity multipliers (Mifflin-St Jeor / Harris-Benedict) ─────────────────

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// ── BMI ───────────────────────────────────────────────────────────────────────

export type BmiCategory =
  | "underweight"
  | "normal"
  | "overweight"
  | "obese_class_1"
  | "obese_class_2"
  | "obese_class_3";

export interface BmiResult {
  value: number;
  category: BmiCategory;
  /** WHO label e.g. "Obese Class II" */
  label: string;
}

const BMI_CATEGORIES: Array<{
  max: number;
  category: BmiCategory;
  label: string;
}> = [
  { max: 18.5, category: "underweight", label: "Underweight" },
  { max: 25, category: "normal", label: "Normal weight" },
  { max: 30, category: "overweight", label: "Overweight" },
  { max: 35, category: "obese_class_1", label: "Obese Class I" },
  { max: 40, category: "obese_class_2", label: "Obese Class II" },
  { max: Infinity, category: "obese_class_3", label: "Obese Class III" },
];

/**
 * Body Mass Index — WHO formula.
 * @param weightKg  weight in kg
 * @param heightCm  height in cm
 */
export function calcBmi(weightKg: number, heightCm: number): BmiResult {
  const heightM = heightCm / 100;
  const value = round2(weightKg / (heightM * heightM));
  const hit = BMI_CATEGORIES.find((c) => value < c.max)!;
  return { value, category: hit.category, label: hit.label };
}

// ── BMR ───────────────────────────────────────────────────────────────────────

/**
 * Basal Metabolic Rate — Mifflin-St Jeor equation (kcal/day).
 * @param weightKg weight in kg
 * @param heightCm height in cm
 * @param ageYears  age in years
 * @param sex       biological sex
 */
export function calcBmr(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: BiologicalSex,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return round2(sex === "male" ? base + 5 : base - 161);
}

// ── TDEE ──────────────────────────────────────────────────────────────────────

/**
 * Total Daily Energy Expenditure = BMR × activity factor (kcal/day).
 */
export function calcTdee(bmr: number, activityLevel: ActivityLevel): number {
  return round2(bmr * ACTIVITY_FACTORS[activityLevel]);
}

// ── Ideal Body Weight ─────────────────────────────────────────────────────────

/**
 * Ideal Body Weight — Devine formula (kg).
 * Reference height: 152 cm (5 ft).  Each cm above that adds sex-specific kg.
 */
export function calcIbw(heightCm: number, sex: BiologicalSex): number {
  const inchesOver5ft = Math.max(0, (heightCm - 152.4) / 2.54);
  const base = sex === "male" ? 50 : 45.5;
  return round2(base + 2.3 * inchesOver5ft);
}

// ── Lean Body Mass ────────────────────────────────────────────────────────────

/**
 * Lean Body Mass — Boer formula (kg).
 */
export function calcLbm(
  weightKg: number,
  heightCm: number,
  sex: BiologicalSex,
): number {
  if (sex === "male") {
    return round2(0.407 * weightKg + 0.267 * heightCm - 19.2);
  }
  return round2(0.252 * weightKg + 0.473 * heightCm - 48.3);
}

// ── Body Fat % — Navy method ──────────────────────────────────────────────────

export interface BodyFatResult {
  /** Body fat percentage */
  bodyFatPct: number;
  /** Lean mass in kg */
  leanMassKg: number;
  /** Fat mass in kg */
  fatMassKg: number;
  category: "essential" | "athlete" | "fitness" | "average" | "obese";
}

/**
 * Body fat % — U.S. Navy circumference method.
 * All measurements in cm.
 * @param heightCm
 * @param waistCm   measured at navel (men) / smallest point (women)
 * @param neckCm    measured below larynx
 * @param sex
 * @param hipCm     required for females
 */
export function calcBodyFat(
  heightCm: number,
  waistCm: number,
  neckCm: number,
  sex: BiologicalSex,
  hipCm?: number,
): BodyFatResult | null {
  if (sex === "female" && hipCm === undefined) return null;

  let pct: number;
  if (sex === "male") {
    pct =
      495 /
        (1.0324 -
          0.19077 * Math.log10(waistCm - neckCm) +
          0.15456 * Math.log10(heightCm)) -
      450;
  } else {
    pct =
      495 /
        (1.29579 -
          0.35004 * Math.log10(waistCm + hipCm! - neckCm) +
          0.221 * Math.log10(heightCm)) -
      450;
  }

  pct = Math.max(3, round2(pct));
  const fatMassKg = round2((pct / 100) * /* weight unknown */ pct); // placeholder — caller should pass weight for mass
  const leanMassKg = 0; // will be enriched by wrapper below

  const category =
    sex === "male"
      ? pct < 6
        ? "essential"
        : pct < 14
          ? "athlete"
          : pct < 18
            ? "fitness"
            : pct < 25
              ? "average"
              : "obese"
      : pct < 14
        ? "essential"
        : pct < 21
          ? "athlete"
          : pct < 25
            ? "fitness"
            : pct < 32
              ? "average"
              : "obese";

  return { bodyFatPct: pct, leanMassKg, fatMassKg, category };
}

/**
 * Full body-fat result including fat & lean mass (kg).
 */
export function calcBodyFatFull(
  weightKg: number,
  heightCm: number,
  waistCm: number,
  neckCm: number,
  sex: BiologicalSex,
  hipCm?: number,
): BodyFatResult | null {
  const base = calcBodyFat(heightCm, waistCm, neckCm, sex, hipCm);
  if (!base) return null;
  const fatMassKg = round2((base.bodyFatPct / 100) * weightKg);
  const leanMassKg = round2(weightKg - fatMassKg);
  return { ...base, fatMassKg, leanMassKg };
}

// ── Waist-to-Height Ratio ─────────────────────────────────────────────────────

export interface WaistHeightResult {
  value: number;
  /** Risk classification */
  risk: "low" | "moderate" | "high" | "very_high";
  label: string;
}

/**
 * Waist-to-Height ratio — strong predictor of cardiometabolic risk.
 * Ashwell / Browning scale.  Keep it below 0.5.
 */
export function calcWaistHeightRatio(
  waistCm: number,
  heightCm: number,
): WaistHeightResult {
  const value = round2(waistCm / heightCm);
  let risk: WaistHeightResult["risk"];
  let label: string;
  if (value < 0.4) {
    risk = "low";
    label = "Slim";
  } else if (value < 0.5) {
    risk = "moderate";
    label = "Healthy range";
  } else if (value < 0.6) {
    risk = "high";
    label = "Overweight — increased risk";
  } else {
    risk = "very_high";
    label = "Obese — high risk";
  }
  return { value, risk, label };
}

// ── Waist-to-Hip Ratio ────────────────────────────────────────────────────────

export interface WaistHipResult {
  value: number;
  risk: "low" | "moderate" | "high";
  label: string;
}

/**
 * Waist-to-Hip ratio — WHO cardiometabolic risk scale.
 * High risk: men > 0.90, women > 0.85.
 */
export function calcWaistHipRatio(
  waistCm: number,
  hipCm: number,
  sex: BiologicalSex,
): WaistHipResult {
  const value = round2(waistCm / hipCm);
  const highThreshold = sex === "male" ? 0.9 : 0.85;
  const moderateThreshold = sex === "male" ? 0.85 : 0.8;

  let risk: WaistHipResult["risk"];
  let label: string;
  if (value <= moderateThreshold) {
    risk = "low";
    label = "Low risk";
  } else if (value <= highThreshold) {
    risk = "moderate";
    label = "Moderate risk";
  } else {
    risk = "high";
    label = "High risk";
  }
  return { value, risk, label };
}

// ── Macro targets ─────────────────────────────────────────────────────────────

export type DietGoal = "lose" | "maintain" | "gain";

export interface MacroTargets {
  /** kcal/day after goal adjustment */
  calories: number;
  /** g/day */
  proteinG: number;
  /** g/day */
  carbsG: number;
  /** g/day */
  fatG: number;
}

/**
 * Macro targets based on TDEE and goal.
 * Deficit (-500 kcal) for weight loss, surplus (+300 kcal) for gain.
 * Protein: 2.0 g/kg lean mass (or weight).
 */
export function calcMacros(
  tdee: number,
  weightKg: number,
  goal: DietGoal,
  leanMassKg?: number,
): MacroTargets {
  const refMass = leanMassKg ?? weightKg;
  let calories = tdee;
  if (goal === "lose") calories -= 500;
  if (goal === "gain") calories += 300;

  const proteinG = round2(refMass * 2.0);
  const fatG = round2((calories * 0.3) / 9);
  const carbsG = round2((calories - proteinG * 4 - fatG * 9) / 4);
  return { calories: round2(calories), proteinG, carbsG, fatG };
}

// ── Daily Water Requirement ───────────────────────────────────────────────────

/**
 * Estimated daily water intake in litres.
 * Rule-of-thumb: 33 ml / kg body weight.
 */
export function calcDailyWaterL(weightKg: number): number {
  return round2(weightKg * 0.033);
}

// ── Age from date-of-birth ────────────────────────────────────────────────────

/**
 * Calculate age in completed years from an ISO date string ("YYYY-MM-DD").
 */
export function calcAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

// ── Convenience: compute all available metrics from a profile ─────────────────

export interface ProfileMetrics {
  age?: number;
  bmi?: BmiResult;
  bmr?: number;
  tdee?: number;
  ibw?: number;
  lbm?: number;
  bodyFat?: BodyFatResult;
  waistHeightRatio?: WaistHeightResult;
  waistHipRatio?: WaistHipResult;
  dailyWaterL?: number;
  macros?: {
    lose: MacroTargets;
    maintain: MacroTargets;
    gain: MacroTargets;
  };
}

export interface ProfileMetricsInput {
  dateOfBirth?: string;
  sex?: BiologicalSex;
  height?: number; // cm
  weight?: number; // kg
  waistCm?: number;
  neckCm?: number;
  hipCm?: number;
  activityLevel?: ActivityLevel;
}

/**
 * Compute all available metrics from a (potentially incomplete) profile.
 * Metrics are only included when the required inputs are present.
 */
export function calcProfileMetrics(p: ProfileMetricsInput): ProfileMetrics {
  const result: ProfileMetrics = {};

  const age = p.dateOfBirth ? calcAge(p.dateOfBirth) : undefined;
  if (age !== undefined) result.age = age;

  if (p.weight && p.height) {
    result.bmi = calcBmi(p.weight, p.height);
    result.dailyWaterL = calcDailyWaterL(p.weight);

    if (p.sex) {
      result.lbm = calcLbm(p.weight, p.height, p.sex);
    }

    if (age !== undefined && p.sex) {
      result.bmr = calcBmr(p.weight, p.height, age, p.sex);
      result.ibw = calcIbw(p.height, p.sex);

      if (p.activityLevel) {
        result.tdee = calcTdee(result.bmr, p.activityLevel);
        result.macros = {
          lose: calcMacros(result.tdee, p.weight, "lose", result.lbm),
          maintain: calcMacros(result.tdee, p.weight, "maintain", result.lbm),
          gain: calcMacros(result.tdee, p.weight, "gain", result.lbm),
        };
      }

      if (p.waistCm && p.neckCm) {
        result.bodyFat =
          calcBodyFatFull(
            p.weight,
            p.height,
            p.waistCm,
            p.neckCm,
            p.sex,
            p.hipCm,
          ) ?? undefined;
      }
    }
  }

  if (p.waistCm && p.height) {
    result.waistHeightRatio = calcWaistHeightRatio(p.waistCm, p.height);
  }

  if (p.waistCm && p.hipCm && p.sex) {
    result.waistHipRatio = calcWaistHipRatio(p.waistCm, p.hipCm, p.sex);
  }

  return result;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
