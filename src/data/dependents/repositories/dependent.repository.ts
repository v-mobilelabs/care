import {
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { FirebaseService } from "@/data/shared/service/firesbase.service";
import { auth } from "@/lib/firebase/admin";
import { stripUndefined } from "@/data/shared/repositories/strip-undefined";
import {
  toDependentDto,
  type DependentDocument,
  type DependentDto,
  type CreateDependentInput,
  type UpdateDependentInput,
} from "../models/dependent.model";

const db = FirebaseService.getInstance().getDb();

/** All profiles (self + dependents) live in the top-level `profiles` collection.
 *  Each document ID is the Firebase Auth UID for that profile.
 */
const profilesCol = () => db.collection("profiles");
const profileDoc = (uid: string) => profilesCol().doc(uid);

export const dependentRepository = {
  async create(input: CreateDependentInput): Promise<DependentDto> {
    // Create a dedicated Firebase Auth account for this dependent profile.
    const authUser = await auth.createUser({
      displayName: `${input.firstName} ${input.lastName}`.trim(),
    });
    const uid = authUser.uid;

    const now = Timestamp.now();
    const doc: DependentDocument = {
      ownerId: input.ownerId,
      isDependent: true,
      kind: "user",
      firstName: input.firstName,
      lastName: input.lastName,
      relationship: input.relationship,
      createdAt: now,
      updatedAt: now,
    };
    if (input.dateOfBirth !== undefined) doc.dateOfBirth = input.dateOfBirth;
    if (input.sex !== undefined) doc.sex = input.sex;
    if (input.height !== undefined) doc.height = input.height;
    if (input.weight !== undefined) doc.weight = input.weight;
    if (input.waistCm !== undefined) doc.waistCm = input.waistCm;
    if (input.neckCm !== undefined) doc.neckCm = input.neckCm;
    if (input.hipCm !== undefined) doc.hipCm = input.hipCm;
    if (input.activityLevel !== undefined)
      doc.activityLevel = input.activityLevel;
    if (input.country !== undefined) doc.country = input.country;
    if (input.city !== undefined) doc.city = input.city;

    await profileDoc(uid).set(stripUndefined(doc));
    return toDependentDto(uid, doc);
  },

  async list(ownerId: string): Promise<DependentDto[]> {
    const snap = await profilesCol()
      .where("ownerId", "==", ownerId)
      .where("isDependent", "==", true)
      .orderBy("createdAt", "asc")
      .get();
    return snap.docs.map((d: QueryDocumentSnapshot) =>
      toDependentDto(d.id, d.data() as DependentDocument),
    );
  },

  async update(input: UpdateDependentInput): Promise<DependentDto> {
    const ref = profileDoc(input.dependentId);
    const now = Timestamp.now();
    const update: Partial<DependentDocument> = { updatedAt: now };

    if (input.firstName !== undefined) update.firstName = input.firstName;
    if (input.lastName !== undefined) update.lastName = input.lastName;
    if (input.relationship !== undefined)
      update.relationship = input.relationship;
    if (input.dateOfBirth !== undefined) update.dateOfBirth = input.dateOfBirth;
    if (input.sex !== undefined) update.sex = input.sex;
    if (input.height !== undefined) update.height = input.height;
    if (input.weight !== undefined) update.weight = input.weight;
    if (input.waistCm !== undefined) update.waistCm = input.waistCm;
    if (input.neckCm !== undefined) update.neckCm = input.neckCm;
    if (input.hipCm !== undefined) update.hipCm = input.hipCm;
    if (input.activityLevel !== undefined)
      update.activityLevel = input.activityLevel;
    if (input.country !== undefined) update.country = input.country;
    if (input.city !== undefined) update.city = input.city;

    // Sync displayName in Firebase Auth when name fields are updated.
    if (update.firstName !== undefined || update.lastName !== undefined) {
      const snap = await ref.get();
      const existing = snap.data() as DependentDocument | undefined;
      const firstName = update.firstName ?? existing?.firstName ?? "";
      const lastName = update.lastName ?? existing?.lastName ?? "";
      await auth
        .updateUser(input.dependentId, {
          displayName: `${firstName} ${lastName}`.trim(),
        })
        .catch(() => {
          /* best-effort — do not fail the update if Auth sync fails */
        });
    }

    await ref.update(update);
    const snap = await ref.get();
    return toDependentDto(ref.id, snap.data() as DependentDocument);
  },

  async delete(ownerId: string, dependentId: string): Promise<void> {
    await Promise.allSettled([
      profileDoc(dependentId).delete(),
      // Delete the Firebase Auth account created for this dependent.
      auth.deleteUser(dependentId).catch(() => {
        /* ignore if already deleted */
      }),
    ]);
  },

  async findById(
    ownerId: string,
    dependentId: string,
  ): Promise<DependentDto | null> {
    const snap = await profileDoc(dependentId).get();
    if (!snap.exists) return null;
    const doc = snap.data() as DependentDocument;
    // Verify ownership before returning.
    if (doc.ownerId !== ownerId) return null;
    return toDependentDto(snap.id, doc);
  },
};
