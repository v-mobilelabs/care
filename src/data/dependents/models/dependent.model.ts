import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

export const RELATIONSHIP_OPTIONS = [
  "Spouse / Partner",
  "Child",
  "Parent",
  "Sibling",
  "Grandparent",
  "Grandchild",
  "Other",
] as const;

export type Relationship = (typeof RELATIONSHIP_OPTIONS)[number];

// ── Firestore document shape ──────────────────────────────────────────────────

export interface DependentDocument {
  /** The owning user's UID */
  ownerId: string;
  /** Discriminator so we can query profiles where isDependent == true */
  isDependent: true;
  firstName: string;
  lastName: string;
  relationship: Relationship;
  dateOfBirth?: string; // ISO date "YYYY-MM-DD"
  /** Biological sex — used for BMR / IBW / body-fat calculations */
  sex?: "male" | "female";
  /** Height in cm */
  height?: number;
  /** Weight in kg */
  weight?: number;
  /** Waist circumference in cm */
  waistCm?: number;
  /** Neck circumference in cm */
  neckCm?: number;
  /** Hip circumference in cm */
  hipCm?: number;
  /**
   * Physical activity multiplier for TDEE = BMR × factor:
   *   sedentary 1.2 | light 1.375 | moderate 1.55 | active 1.725 | very_active 1.9
   */
  activityLevel?: "sedentary" | "light" | "moderate" | "active" | "very_active";
  country?: string;
  city?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── DTO — outbound ────────────────────────────────────────────────────────────

export interface DependentDto {
  id: string;
  ownerId: string;
  firstName: string;
  lastName: string;
  relationship: Relationship;
  dateOfBirth?: string;
  sex?: "male" | "female";
  height?: number;
  weight?: number;
  waistCm?: number;
  neckCm?: number;
  hipCm?: number;
  activityLevel?: "sedentary" | "light" | "moderate" | "active" | "very_active";
  country?: string;
  city?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toDependentDto(
  id: string,
  doc: DependentDocument,
): DependentDto {
  return {
    id,
    ownerId: doc.ownerId,
    firstName: doc.firstName,
    lastName: doc.lastName,
    relationship: doc.relationship,
    dateOfBirth: doc.dateOfBirth,
    sex: doc.sex,
    height: doc.height,
    weight: doc.weight,
    waistCm: doc.waistCm,
    neckCm: doc.neckCm,
    hipCm: doc.hipCm,
    activityLevel: doc.activityLevel,
    country: doc.country,
    city: doc.city,
    createdAt: doc.createdAt.toDate().toISOString(),
    updatedAt: doc.updatedAt.toDate().toISOString(),
  };
}

// ── Schemas — inbound ─────────────────────────────────────────────────────────

const RelationshipSchema = z.enum(RELATIONSHIP_OPTIONS);

export const CreateDependentSchema = z.object({
  ownerId: z.string().min(1),
  firstName: z.string().min(1).max(50),
  lastName: z.string().max(50).default(""),
  relationship: RelationshipSchema,
  dateOfBirth: z.string().optional(),
  sex: z.enum(["male", "female"]).optional(),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  waistCm: z.number().positive().optional(),
  neckCm: z.number().positive().optional(),
  hipCm: z.number().positive().optional(),
  activityLevel: z
    .enum(["sedentary", "light", "moderate", "active", "very_active"])
    .optional(),
  country: z.string().optional(),
  city: z.string().optional(),
});

export type CreateDependentInput = z.infer<typeof CreateDependentSchema>;

export const UpdateDependentSchema = z.object({
  ownerId: z.string().min(1),
  dependentId: z.string().min(1),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().max(50).optional(),
  relationship: RelationshipSchema.optional(),
  dateOfBirth: z.string().optional(),
  sex: z.enum(["male", "female"]).optional(),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  waistCm: z.number().positive().optional(),
  neckCm: z.number().positive().optional(),
  hipCm: z.number().positive().optional(),
  activityLevel: z
    .enum(["sedentary", "light", "moderate", "active", "very_active"])
    .optional(),
  country: z.string().optional(),
  city: z.string().optional(),
});

export type UpdateDependentInput = z.infer<typeof UpdateDependentSchema>;

export const DeleteDependentSchema = z.object({
  ownerId: z.string().min(1),
  dependentId: z.string().min(1),
});

export type DeleteDependentInput = z.infer<typeof DeleteDependentSchema>;

export const ListDependentsSchema = z.object({
  ownerId: z.string().min(1),
});

export type ListDependentsInput = z.infer<typeof ListDependentsSchema>;
