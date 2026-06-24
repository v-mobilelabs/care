import { z } from "zod";
import type { Timestamp } from "firebase-admin/firestore";

// ── Clinic sub-document ───────────────────────────────────────────────────────

export interface ClinicInfo {
  name: string;
  address: string;
  phone?: string;
  website?: string;
  hours?: string;
  rating?: number;
  placeId?: string;
}

// ── Firestore document shape ──────────────────────────────────────────────────

export interface DoctorDocument {
  userId: string;
  name: string;
  specialty: string;
  address: string;
  clinic?: ClinicInfo;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── DTO — outbound ────────────────────────────────────────────────────────────

export interface DoctorDto {
  id: string;
  userId: string;
  name: string;
  specialty: string;
  address: string;
  clinic?: ClinicInfo;
  notes?: string;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

// ── Mapper ────────────────────────────────────────────────────────────────────

export function toDoctorDto(id: string, doc: DoctorDocument): DoctorDto {
  return {
    id,
    userId: doc.userId,
    name: doc.name,
    specialty: doc.specialty,
    address: doc.address,
    clinic: doc.clinic,
    notes: doc.notes,
    createdAt: doc.createdAt.toDate().toISOString(),
    updatedAt: doc.updatedAt.toDate().toISOString(),
  };
}

// ── Zod schemas for clinic info ───────────────────────────────────────────────

export const ClinicInfoSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().optional(),
  website: z.string().optional(),
  hours: z.string().optional(),
  rating: z.number().optional(),
  placeId: z.string().optional(),
});

// ── DTO — inbound (create) ────────────────────────────────────────────────────

export const CreateDoctorSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  name: z.string().min(1, { message: "Doctor name is required" }),
  specialty: z.string().min(1, { message: "Specialty is required" }),
  address: z.string().min(1, { message: "Address is required" }),
  clinic: ClinicInfoSchema.optional(),
  notes: z.string().optional(),
});

export type CreateDoctorInput = z.infer<typeof CreateDoctorSchema>;

// ── DTO — inbound (list) ──────────────────────────────────────────────────────

export const ListDoctorsSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  limit: z.number().int().min(1).max(100).optional().default(50),
});

export type ListDoctorsInput = z.infer<typeof ListDoctorsSchema>;

// ── DTO — inbound (delete) ────────────────────────────────────────────────────

export const DeleteDoctorSchema = z.object({
  userId: z.string().min(1, { message: "userId is required" }),
  doctorId: z.string().min(1, { message: "doctorId is required" }),
});

export type DeleteDoctorInput = z.infer<typeof DeleteDoctorSchema>;
