import {
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { FirebaseService } from "@/data/shared/service/firesbase.service";
import {
  toDependentDto,
  type DependentDocument,
  type DependentDto,
  type CreateDependentInput,
  type UpdateDependentInput,
} from "../models/dependent.model";

const db = FirebaseService.getInstance().getDb();

/** All profiles (self + dependents) live under users/{ownerId}/profiles */
const profilesCol = (ownerId: string) =>
  db.collection("users").doc(ownerId).collection("profiles");

export const dependentRepository = {
  async create(input: CreateDependentInput): Promise<DependentDto> {
    const now = Timestamp.now();
    const doc: DependentDocument = {
      ownerId: input.ownerId,
      isDependent: true,
      firstName: input.firstName,
      lastName: input.lastName,
      relationship: input.relationship,
      createdAt: now,
      updatedAt: now,
    };
    if (input.dateOfBirth !== undefined) doc.dateOfBirth = input.dateOfBirth;
    if (input.height !== undefined) doc.height = input.height;
    if (input.weight !== undefined) doc.weight = input.weight;
    if (input.country !== undefined) doc.country = input.country;
    if (input.city !== undefined) doc.city = input.city;

    const ref = profilesCol(input.ownerId).doc();
    await ref.set(doc);
    return toDependentDto(ref.id, doc);
  },

  async list(ownerId: string): Promise<DependentDto[]> {
    const snap = await profilesCol(ownerId)
      .where("isDependent", "==", true)
      .orderBy("createdAt", "asc")
      .get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toDependentDto(d.id, d.data() as DependentDocument),
    );
  },

  async update(input: UpdateDependentInput): Promise<DependentDto> {
    const ref = profilesCol(input.ownerId).doc(input.dependentId);
    const now = Timestamp.now();
    const update: Partial<DependentDocument> = { updatedAt: now };

    if (input.firstName !== undefined) update.firstName = input.firstName;
    if (input.lastName !== undefined) update.lastName = input.lastName;
    if (input.relationship !== undefined)
      update.relationship = input.relationship;
    if (input.dateOfBirth !== undefined) update.dateOfBirth = input.dateOfBirth;
    if (input.height !== undefined) update.height = input.height;
    if (input.weight !== undefined) update.weight = input.weight;
    if (input.country !== undefined) update.country = input.country;
    if (input.city !== undefined) update.city = input.city;

    await ref.update(update);
    const snap = await ref.get();
    return toDependentDto(ref.id, snap.data() as DependentDocument);
  },

  async delete(ownerId: string, dependentId: string): Promise<void> {
    await profilesCol(ownerId).doc(dependentId).delete();
  },

  async findById(
    ownerId: string,
    dependentId: string,
  ): Promise<DependentDto | null> {
    const snap = await profilesCol(ownerId).doc(dependentId).get();
    if (!snap.exists) return null;
    return toDependentDto(snap.id, snap.data() as DependentDocument);
  },
};
