import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Firestore document shape ──────────────────────────────────────────────────

export interface VitalDocument {
  userId: string;
  /** Biological sex — used for body-fat and WHR calculations */
  sex?: "male" | "female";
  /** Waist circumference in cm */
  waistCm?: number;
  /** Hip circumference in cm — WHR and female body-fat formula */
  hipCm?: number;
  /** Neck circumference in cm — used in Navy body-fat formula */
  neckCm?: number;
  /** Physical activity level */
  activityLevel?: "sedentary" | "light" | "moderate" | "active" | "very_active";
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
  /** Blood glucose (random/casual) in mmol/L */
  glucoseMmol?: number;
  /** Optional note / context (e.g. "after exercise", "fasting") */
  note?: string;
  /** ISO-8601 date-time of the measurement (defaults to server time) */
  measuredAt: Timestamp;
  createdAt: Timestamp;
}

// ── DTO — outbound ────────────────────────────────────────────────────────────

export interface VitalDto {
  id: string;
  userId: string;
  sex?: "male" | "female";
  waistCm?: number;
  hipCm?: number;
  neckCm?: number;
  activityLevel?: "sedentary" | "light" | "moderate" | "active" | "very_active";
  systolicBp?: number;
  diastolicBp?: number;
  restingHr?: number;
  spo2?: number;
  temperatureC?: number;
  respiratoryRate?: number;
  glucoseMmol?: number;
  note?: string;
  /** Derived: blood pressure classification (JNC-8 / ACC-AHA 2017) */
  bpCategory?: BpCategory;
  measuredAt: string; // ISO-8601
  createdAt: string; // ISO-8601
}

// ── Blood-pressure classification ────────────────────────────────────────────

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

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toVitalDto(id: string, doc: VitalDocument): VitalDto {
  const dto: VitalDto = {
    id,
    userId: doc.userId,
    sex: doc.sex,
    waistCm: doc.waistCm,
    hipCm: doc.hipCm,
    neckCm: doc.neckCm,
    activityLevel: doc.activityLevel,
    systolicBp: doc.systolicBp,
    diastolicBp: doc.diastolicBp,
    restingHr: doc.restingHr,
    spo2: doc.spo2,
    temperatureC: doc.temperatureC,
    respiratoryRate: doc.respiratoryRate,
    glucoseMmol: doc.glucoseMmol,
    note: doc.note,
    measuredAt: doc.measuredAt.toDate().toISOString(),
    createdAt: doc.createdAt.toDate().toISOString(),
  };

  if (doc.systolicBp !== undefined && doc.diastolicBp !== undefined) {
    dto.bpCategory = classifyBp(doc.systolicBp, doc.diastolicBp);
  }

  return dto;
}

// ── Schemas — inbound ────────────────────────────────────────────────────────

export const CreateVitalSchema = z.object({
  userId: z.string().min(1),
  sex: z.enum(["male", "female"]).optional(),
  waistCm: z.number().positive().optional(),
  hipCm: z.number().positive().optional(),
  neckCm: z.number().positive().optional(),
  activityLevel: z
    .enum(["sedentary", "light", "moderate", "active", "very_active"])
    .optional(),
  systolicBp: z.number().int().min(50).max(300).optional(),
  diastolicBp: z.number().int().min(20).max(200).optional(),
  restingHr: z.number().int().min(20).max(300).optional(),
  spo2: z.number().min(50).max(100).optional(),
  temperatureC: z.number().min(30).max(45).optional(),
  respiratoryRate: z.number().int().min(4).max(60).optional(),
  glucoseMmol: z.number().min(1).max(50).optional(),
  note: z.string().max(500).optional(),
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
