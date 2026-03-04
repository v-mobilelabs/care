import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Firestore document shape ──────────────────────────────────────────────────

export interface LabDocument {
  userId: string;
  /** HbA1c — glycated haemoglobin in % */
  hba1cPct?: number;
  /** Fasting plasma glucose in mmol/L */
  fastingGlucoseMmol?: number;
  /** Serum creatinine in µmol/L */
  creatinineUmol?: number;
  /** eGFR calculated by CKD-EPI equation (mL/min/1.73 m²) — derived & stored */
  egfr?: number;
  /** Total cholesterol in mmol/L */
  totalCholesterolMmol?: number;
  /** LDL cholesterol in mmol/L */
  ldlMmol?: number;
  /** HDL cholesterol in mmol/L */
  hdlMmol?: number;
  /** Triglycerides in mmol/L */
  triglyceridesMmol?: number;
  /** Fasting insulin in µIU/mL — for HOMA-IR */
  fastingInsulinUiu?: number;
  /** HOMA-IR — insulin resistance index — derived & stored */
  homaIr?: number;
  /** TSH — thyroid-stimulating hormone in mIU/L */
  tshMiu?: number;
  /** 25-OH Vitamin D in nmol/L */
  vitaminDNmol?: number;
  /** Haemoglobin in g/dL */
  haemoglobinGdl?: number;
  /** Optional label, e.g. "Annual blood panel 2026" */
  label?: string;
  note?: string;
  /** ISO-8601 date-time of the lab draw */
  drawnAt: Timestamp;
  createdAt: Timestamp;
}

// ── DTO — outbound ────────────────────────────────────────────────────────────

export interface LabDto {
  id: string;
  userId: string;
  hba1cPct?: number;
  /** ADA diabetes classification derived from HbA1c */
  hba1cCategory?: Hba1cCategory;
  fastingGlucoseMmol?: number;
  /** ADA glucose classification */
  glucoseCategory?: GlucoseCategory;
  creatinineUmol?: number;
  egfr?: number;
  /** CKD stage derived from eGFR */
  ckdStage?: CkdStage;
  totalCholesterolMmol?: number;
  ldlMmol?: number;
  hdlMmol?: number;
  triglyceridesMmol?: number;
  fastingInsulinUiu?: number;
  homaIr?: number;
  /** HOMA-IR risk classification */
  homaIrCategory?: HomaIrCategory;
  tshMiu?: number;
  vitaminDNmol?: number;
  haemoglobinGdl?: number;
  label?: string;
  note?: string;
  drawnAt: string; // ISO-8601
  createdAt: string; // ISO-8601
}

// ── Clinical classifications ──────────────────────────────────────────────────

export type Hba1cCategory = "normal" | "prediabetes" | "diabetes";
export type GlucoseCategory = "normal" | "impaired" | "diabetes";
export type CkdStage = "G1" | "G2" | "G3a" | "G3b" | "G4" | "G5";
export type HomaIrCategory = "normal" | "insulin_resistant";

export function classifyHba1c(pct: number): Hba1cCategory {
  if (pct < 5.7) return "normal";
  if (pct < 6.5) return "prediabetes";
  return "diabetes";
}

export function classifyFastingGlucose(mmol: number): GlucoseCategory {
  if (mmol < 5.6) return "normal";
  if (mmol < 7.0) return "impaired";
  return "diabetes";
}

export function classifyCkd(egfr: number): CkdStage {
  if (egfr >= 90) return "G1";
  if (egfr >= 60) return "G2";
  if (egfr >= 45) return "G3a";
  if (egfr >= 30) return "G3b";
  if (egfr >= 15) return "G4";
  return "G5";
}

export function classifyHomaIr(value: number): HomaIrCategory {
  return value >= 2.5 ? "insulin_resistant" : "normal";
}

/**
 * CKD-EPI 2021 eGFR (mL/min/1.73 m²) — race-free equation.
 * @param creatinineUmol  serum creatinine in µmol/L
 * @param ageYears
 * @param sex  biological sex
 */
export function calcEgfr(
  creatinineUmol: number,
  ageYears: number,
  sex: "male" | "female",
): number {
  const scr = creatinineUmol / 88.4; // convert to mg/dL
  const kappa = sex === "female" ? 0.7 : 0.9;
  const alpha = sex === "female" ? -0.241 : -0.302;
  const sexFactor = sex === "female" ? 1.012 : 1.0;
  const ratio = scr / kappa;
  const val =
    142 *
    Math.pow(Math.min(ratio, 1), alpha) *
    Math.pow(Math.max(ratio, 1), -1.2) *
    Math.pow(0.9938, ageYears) *
    sexFactor;
  return Math.round(val * 10) / 10;
}

/**
 * HOMA-IR insulin resistance index.
 * @param fastingGlucoseMmol
 * @param fastingInsulinUiu
 */
export function calcHomaIr(
  fastingGlucoseMmol: number,
  fastingInsulinUiu: number,
): number {
  return (
    Math.round(((fastingGlucoseMmol * fastingInsulinUiu) / 22.5) * 100) / 100
  );
}

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toLabDto(id: string, doc: LabDocument): LabDto {
  const dto: LabDto = {
    id,
    userId: doc.userId,
    hba1cPct: doc.hba1cPct,
    fastingGlucoseMmol: doc.fastingGlucoseMmol,
    creatinineUmol: doc.creatinineUmol,
    egfr: doc.egfr,
    totalCholesterolMmol: doc.totalCholesterolMmol,
    ldlMmol: doc.ldlMmol,
    hdlMmol: doc.hdlMmol,
    triglyceridesMmol: doc.triglyceridesMmol,
    fastingInsulinUiu: doc.fastingInsulinUiu,
    homaIr: doc.homaIr,
    tshMiu: doc.tshMiu,
    vitaminDNmol: doc.vitaminDNmol,
    haemoglobinGdl: doc.haemoglobinGdl,
    label: doc.label,
    note: doc.note,
    drawnAt: doc.drawnAt.toDate().toISOString(),
    createdAt: doc.createdAt.toDate().toISOString(),
  };

  if (doc.hba1cPct !== undefined)
    dto.hba1cCategory = classifyHba1c(doc.hba1cPct);
  if (doc.fastingGlucoseMmol !== undefined)
    dto.glucoseCategory = classifyFastingGlucose(doc.fastingGlucoseMmol);
  if (doc.egfr !== undefined) dto.ckdStage = classifyCkd(doc.egfr);
  if (doc.homaIr !== undefined) dto.homaIrCategory = classifyHomaIr(doc.homaIr);

  return dto;
}

// ── Schemas — inbound ────────────────────────────────────────────────────────

export const CreateLabSchema = z.object({
  userId: z.string().min(1),
  hba1cPct: z.number().min(3).max(20).optional(),
  fastingGlucoseMmol: z.number().min(1).max(30).optional(),
  creatinineUmol: z.number().min(10).max(2000).optional(),
  /**
   * eGFR can be provided directly (from lab report) or computed from
   * creatinine + age + sex if caller sets computeEgfr = true.
   */
  egfr: z.number().min(1).max(200).optional(),
  totalCholesterolMmol: z.number().min(1).max(20).optional(),
  ldlMmol: z.number().min(0.5).max(15).optional(),
  hdlMmol: z.number().min(0.1).max(10).optional(),
  triglyceridesMmol: z.number().min(0.1).max(30).optional(),
  fastingInsulinUiu: z.number().min(0.5).max(200).optional(),
  tshMiu: z.number().min(0.001).max(100).optional(),
  vitaminDNmol: z.number().min(1).max(500).optional(),
  haemoglobinGdl: z.number().min(3).max(25).optional(),
  label: z.string().max(120).optional(),
  note: z.string().max(1000).optional(),
  /** ISO-8601; defaults to now */
  drawnAt: z.iso.datetime().optional(),
});

export type CreateLabInput = z.infer<typeof CreateLabSchema>;

export const ListLabsSchema = z.object({
  userId: z.string().min(1),
  limit: z.number().int().min(1).max(200).optional().default(50),
});

export type ListLabsInput = z.infer<typeof ListLabsSchema>;

export const LabRefSchema = z.object({
  userId: z.string().min(1),
  labId: z.string().min(1),
});

export type LabRefInput = z.infer<typeof LabRefSchema>;
