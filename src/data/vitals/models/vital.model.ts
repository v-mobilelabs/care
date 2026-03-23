import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Firestore document shape ──────────────────────────────────────────────────

export interface VitalDocument {
  userId: string;
  /** Body weight in kg */
  weightKg?: number;
  /** Height in cm */
  heightCm?: number;
  /** Systolic blood pressure in mmHg */
  systolicBp?: number;
  /** Diastolic blood pressure in mmHg */
  diastolicBp?: number;
  /** Resting heart rate in bpm */
  restingHr?: number;
  /** Peripheral oxygen saturation in % */
  spo2?: number;
  /** Body temperature in °C */
  temperatureC?: number;
  /** Respiratory rate in breaths/min */
  respiratoryRate?: number;
  /** Blood glucose (random/casual) in mg/dL */
  glucoseMgdl?: number;
  /** ISO-8601 date-time of the measurement (defaults to server time) */
  measuredAt: Timestamp;
  createdAt: Timestamp;
}

// ── DTO — outbound ────────────────────────────────────────────────────────────

export interface VitalDto {
  id: string;
  userId: string;
  weightKg?: number;
  heightCm?: number;
  systolicBp?: number;
  diastolicBp?: number;
  restingHr?: number;
  spo2?: number;
  temperatureC?: number;
  respiratoryRate?: number;
  glucoseMgdl?: number;
  /** Derived: BMI = weight(kg) / height(m)² */
  bmi?: number;
  /** Derived: blood pressure classification (ACC/AHA 2017) */
  bpCategory?: BpCategory;
  /** Derived: heart rate classification */
  hrCategory?: HrCategory;
  /** Derived: SpO2 classification */
  spo2Category?: Spo2Category;
  /** Derived: temperature classification */
  tempCategory?: TempCategory;
  /** Derived: glucose classification (mg/dL random) */
  glucoseCategory?: GlucoseCategory;
  measuredAt: string; // ISO-8601
  createdAt: string; // ISO-8601
}

// ── Blood-pressure classification (ACC/AHA 2017) ─────────────────────────────

export type BpCategory =
  | "normal"
  | "elevated"
  | "high_stage_1"
  | "high_stage_2"
  | "hypertensive_crisis";

export function classifyBp(systolic: number, diastolic: number): BpCategory {
  if (systolic >= 180 || diastolic >= 120) return "hypertensive_crisis";
  if (systolic >= 140 || diastolic >= 90) return "high_stage_2";
  if (systolic >= 130 || diastolic >= 80) return "high_stage_1";
  if (systolic >= 120 && diastolic < 80) return "elevated";
  return "normal";
}

// ── Heart-rate classification (resting, adults) ──────────────────────────────

export type HrCategory = "low" | "normal" | "high";

export function classifyHr(bpm: number): HrCategory {
  if (bpm < 60) return "low";
  if (bpm > 100) return "high";
  return "normal";
}

// ── SpO2 classification ──────────────────────────────────────────────────────

export type Spo2Category = "normal" | "low" | "critical";

export function classifySpo2(pct: number): Spo2Category {
  if (pct < 90) return "critical";
  if (pct < 95) return "low";
  return "normal";
}

// ── Temperature classification (°C) ─────────────────────────────────────────

export type TempCategory =
  | "low"
  | "normal"
  | "elevated"
  | "fever"
  | "high_fever";

export function classifyTemp(c: number): TempCategory {
  if (c < 36.1) return "low";
  if (c <= 37.2) return "normal";
  if (c <= 38.0) return "elevated";
  if (c <= 39.4) return "fever";
  return "high_fever";
}

// ── Blood-glucose classification (mg/dL, random / casual) ───────────────────

export type GlucoseCategory = "low" | "normal" | "elevated" | "high";

export function classifyGlucose(mgdl: number): GlucoseCategory {
  if (mgdl < 70) return "low";
  if (mgdl <= 140) return "normal";
  if (mgdl <= 200) return "elevated";
  return "high";
}

// ── BMI helper ──────────────────────────────────────────────────────────────

export function calcBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toVitalDto(id: string, doc: VitalDocument): VitalDto {
  const dto: VitalDto = {
    id,
    userId: doc.userId,
    weightKg: doc.weightKg,
    heightCm: doc.heightCm,
    systolicBp: doc.systolicBp,
    diastolicBp: doc.diastolicBp,
    restingHr: doc.restingHr,
    spo2: doc.spo2,
    temperatureC: doc.temperatureC,
    respiratoryRate: doc.respiratoryRate,
    glucoseMgdl: doc.glucoseMgdl,
    measuredAt: doc.measuredAt.toDate().toISOString(),
    createdAt: doc.createdAt.toDate().toISOString(),
  };

  if (doc.weightKg !== undefined && doc.heightCm !== undefined) {
    dto.bmi = calcBmi(doc.weightKg, doc.heightCm);
  }
  if (doc.systolicBp !== undefined && doc.diastolicBp !== undefined) {
    dto.bpCategory = classifyBp(doc.systolicBp, doc.diastolicBp);
  }
  if (doc.restingHr !== undefined) {
    dto.hrCategory = classifyHr(doc.restingHr);
  }
  if (doc.spo2 !== undefined) {
    dto.spo2Category = classifySpo2(doc.spo2);
  }
  if (doc.temperatureC !== undefined) {
    dto.tempCategory = classifyTemp(doc.temperatureC);
  }
  if (doc.glucoseMgdl !== undefined) {
    dto.glucoseCategory = classifyGlucose(doc.glucoseMgdl);
  }

  return dto;
}

// ── Schemas — inbound ────────────────────────────────────────────────────────

export const CreateVitalSchema = z.object({
  userId: z.string().min(1),
  weightKg: z.number().min(1).max(500).optional(),
  heightCm: z.number().min(30).max(300).optional(),
  systolicBp: z.number().int().min(50).max(300).optional(),
  diastolicBp: z.number().int().min(20).max(200).optional(),
  restingHr: z.number().int().min(20).max(300).optional(),
  spo2: z.number().min(50).max(100).optional(),
  temperatureC: z.number().min(30).max(45).optional(),
  respiratoryRate: z.number().int().min(4).max(60).optional(),
  glucoseMgdl: z.number().min(10).max(800).optional(),
  /** ISO-8601 string; defaults to now when omitted */
  measuredAt: z.iso.datetime().optional(),
});

export type CreateVitalInput = z.infer<typeof CreateVitalSchema>;

export const ListVitalsSchema = z.object({
  userId: z.string().min(1),
  limit: z.number().int().min(1).max(200).optional().default(100),
});

export type ListVitalsInput = z.infer<typeof ListVitalsSchema>;

export const VitalRefSchema = z.object({
  userId: z.string().min(1),
  vitalId: z.string().min(1),
});

export type VitalRefInput = z.infer<typeof VitalRefSchema>;
